import * as k8s from '@kubernetes/client-node';
import { Deployment, DeploymentStatus, ReplicaInfo, DeploymentDetail, PodInfo, ContainerInfo, PodLogsResponse, FileInfo, DirectoryListingResponse, FileContentResponse } from '../types';
import { Exec } from '@kubernetes/client-node';

export class KubernetesService {
  private appsApi: k8s.AppsV1Api;
  private coreApi: k8s.CoreV1Api;
  private networkingApi: k8s.NetworkingV1Api;
  private kubeConfig: k8s.KubeConfig;

  constructor() {
    this.kubeConfig = new k8s.KubeConfig();

    // Auto-detect: in-cluster or local kubeconfig
    if (process.env.KUBERNETES_SERVICE_HOST) {
      console.log('Loading in-cluster Kubernetes config');
      this.kubeConfig.loadFromCluster();
    } else {
      console.log('Loading local Kubernetes config');
      this.kubeConfig.loadFromDefault();
    }

    this.appsApi = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
    this.coreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.networkingApi = this.kubeConfig.makeApiClient(k8s.NetworkingV1Api);
  }

  async getNamespaces(excludeList: string[]): Promise<string[]> {
    try {
      const response = await this.coreApi.listNamespace();
      const items = response.body.items;
      const excludeSet = new Set(excludeList.map(n => n.toLowerCase()));

      return items
        .map(ns => ns.metadata?.name ?? '')
        .filter(name => name && !excludeSet.has(name.toLowerCase()))
        .sort();
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      return [];
    }
  }

  async getServerVersion(): Promise<string> {
    try {
      const versionApi = this.kubeConfig.makeApiClient(k8s.VersionApi);
      const response = await versionApi.getCode();
      return response.body.gitVersion;
    } catch {
      return 'unknown';
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.getServerVersion();
      return true;
    } catch {
      return false;
    }
  }

  async getDeployments(namespace: string): Promise<Deployment[]> {
    try {
      const [deploymentsRes, ingressUrls] = await Promise.all([
        this.appsApi.listNamespacedDeployment(namespace),
        this.getIngressUrls(namespace),
      ]);
      const items = deploymentsRes.body.items;
      return items.map((item) => {
        const name = item.metadata?.name ?? '';
        const release = item.metadata?.labels?.['release'] ?? name;
        const urls = ingressUrls.get(release) ?? ingressUrls.get(name) ?? [];
        return this.mapDeployment(item, urls);
      });
    } catch (error) {
      console.error(`Error fetching deployments from ${namespace}:`, error);
      throw error;
    }
  }

  async getDeployment(namespace: string, name: string): Promise<Deployment | null> {
    try {
      const response = await this.appsApi.readNamespacedDeployment(name, namespace);
      return this.mapDeployment(response.body);
    } catch (error: unknown) {
      const statusCode = (error as { response?: { statusCode?: number } }).response?.statusCode
        ?? (error as { statusCode?: number }).statusCode;
      if (statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async scaleDeployment(namespace: string, name: string, replicas: number): Promise<void> {
    try {
      // Read current scale
      const scaleRes = await this.appsApi.readNamespacedDeploymentScale(name, namespace);
      const scale = scaleRes.body;

      // Update replicas
      scale.spec = { replicas };

      // Replace scale
      await this.appsApi.replaceNamespacedDeploymentScale(name, namespace, scale);
    } catch (error) {
      console.error(`Error scaling deployment ${namespace}/${name}:`, error);
      throw error;
    }
  }

  async getIngressUrls(namespace: string): Promise<Map<string, string[]>> {
    const urlMap = new Map<string, string[]>();
    try {
      const response = await this.networkingApi.listNamespacedIngress(namespace);
      const items = response.body.items;

      for (const ingress of items) {
        const release = ingress.metadata?.labels?.['release'] ?? ingress.metadata?.name;
        if (!release) continue;

        const rules = ingress.spec?.rules ?? [];
        const hasTls = (ingress.spec?.tls?.length ?? 0) > 0;

        for (const rule of rules) {
          if (rule.host) {
            const protocol = hasTls ? 'https' : 'http';
            const url = `${protocol}://${rule.host}`;

            // Merge URLs for same release
            const existing = urlMap.get(release) ?? [];
            if (!existing.includes(url)) {
              existing.push(url);
              urlMap.set(release, existing);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching ingresses from ${namespace}:`, error);
    }
    return urlMap;
  }

  private mapDeployment(item: k8s.V1Deployment, urls?: string[]): Deployment {
    const spec = item.spec;
    const status = item.status;

    const replicas: ReplicaInfo = {
      desired: spec?.replicas ?? 0,
      ready: status?.readyReplicas ?? 0,
      available: status?.availableReplicas ?? 0,
      unavailable: status?.unavailableReplicas ?? 0,
    };

    return {
      name: item.metadata?.name ?? 'unknown',
      namespace: item.metadata?.namespace ?? 'unknown',
      status: this.determineStatus(spec?.replicas ?? 0, status),
      replicas,
      labels: item.metadata?.labels ?? {},
      createdAt: item.metadata?.creationTimestamp?.toISOString() ?? new Date().toISOString(),
      urls: urls ?? [],
    };
  }

  private determineStatus(
    desiredReplicas: number,
    status?: k8s.V1DeploymentStatus
  ): DeploymentStatus {
    // Scaled to zero
    if (desiredReplicas === 0) {
      return 'scaled_to_zero';
    }

    // No ready replicas
    if (!status?.readyReplicas || status.readyReplicas === 0) {
      const conditions = status?.conditions ?? [];
      const availableCondition = conditions.find((c) => c.type === 'Available');

      if (availableCondition?.status === 'False') {
        return 'error';
      }

      const progressingCondition = conditions.find((c) => c.type === 'Progressing');
      if (progressingCondition?.status === 'True') {
        return 'pending';
      }

      return 'error';
    }

    // All replicas ready
    if (status.readyReplicas >= desiredReplicas) {
      return 'running';
    }

    // Partially ready
    return 'pending';
  }

  async getDeploymentDetail(namespace: string, name: string): Promise<DeploymentDetail | null> {
    try {
      const [deploymentRes, pods] = await Promise.all([
        this.appsApi.readNamespacedDeployment(name, namespace),
        this.getPodsForDeployment(namespace, name),
      ]);

      const deployment = deploymentRes.body;
      const urls = await this.getIngressUrls(namespace);
      const release = deployment.metadata?.labels?.['release'] ?? name;
      const deploymentUrls = urls.get(release) ?? urls.get(name) ?? [];

      return {
        ...this.mapDeployment(deployment, deploymentUrls),
        pods,
        containers: this.extractContainerInfo(deployment),
      };
    } catch (error) {
      const statusCode = (error as any).response?.statusCode ?? (error as any).statusCode;
      if (statusCode === 404) return null;
      throw error;
    }
  }

  async getPodsForDeployment(namespace: string, deploymentName: string): Promise<PodInfo[]> {
    try {
      // First, get the deployment to find its selector labels
      const deploymentRes = await this.appsApi.readNamespacedDeployment(deploymentName, namespace);
      const selector = deploymentRes.body.spec?.selector?.matchLabels;

      if (!selector) return [];

      // Build label selector string
      const labelSelector = Object.entries(selector)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');

      // Fetch pods matching the selector
      const podsRes = await this.coreApi.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        labelSelector
      );

      return podsRes.body.items.map(pod => this.mapPodInfo(pod));
    } catch (error) {
      console.error(`Error fetching pods for ${namespace}/${deploymentName}:`, error);
      return [];
    }
  }

  private mapPodInfo(pod: k8s.V1Pod): PodInfo {
    const status = pod.status;
    const metadata = pod.metadata;

    // Calculate age
    const createdAt = metadata?.creationTimestamp;
    const age = createdAt ? this.calculateAge(createdAt) : 'unknown';

    // Get container statuses
    const containerStatuses = (status?.containerStatuses ?? []).map(cs => ({
      name: cs.name,
      ready: cs.ready,
      restartCount: cs.restartCount,
      state: cs.state?.running ? 'running'
           : cs.state?.waiting ? 'waiting'
           : cs.state?.terminated ? 'terminated'
           : 'unknown',
    }));

    // Calculate total restart count
    const totalRestartCount = containerStatuses.reduce((sum, cs) => sum + cs.restartCount, 0);

    return {
      name: metadata?.name ?? 'unknown',
      status: status?.phase ?? 'Unknown',
      restartCount: totalRestartCount,
      age,
      containerStatuses,
    };
  }

  private extractContainerInfo(deployment: k8s.V1Deployment): ContainerInfo[] {
    const containers = deployment.spec?.template?.spec?.containers ?? [];

    return containers.map(container => {
      const [image, tag] = this.parseImageTag(container.image ?? '');

      return {
        name: container.name,
        image,
        imageTag: tag,
        resources: {
          limits: {
            cpu: container.resources?.limits?.cpu,
            memory: container.resources?.limits?.memory,
          },
          requests: {
            cpu: container.resources?.requests?.cpu,
            memory: container.resources?.requests?.memory,
          },
        },
      };
    });
  }

  private parseImageTag(imageStr: string): [string, string] {
    const lastColon = imageStr.lastIndexOf(':');
    if (lastColon === -1) return [imageStr, 'latest'];

    const image = imageStr.substring(0, lastColon);
    const tag = imageStr.substring(lastColon + 1);

    return [image, tag];
  }

  private calculateAge(createdAt: Date): string {
    const now = new Date();
    const diff = now.getTime() - createdAt.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  async getPodLogs(namespace: string, podName: string, containerName?: string, tailLines: number = 100): Promise<PodLogsResponse> {
    try {
      const logs = await this.coreApi.readNamespacedPodLog(
        podName,
        namespace,
        containerName, // container name - if undefined, K8s will error if multiple containers
        false, // follow
        undefined, // insecureSkipTLSVerifyBackend
        undefined, // limitBytes
        undefined, // pretty
        false, // previous
        undefined, // sinceSeconds
        tailLines, // tailLines
        false // timestamps
      );

      return {
        podName,
        logs: logs.body,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error fetching logs for pod ${namespace}/${podName}:`, error);
      throw error;
    }
  }

  async execInPod(namespace: string, podName: string, containerName: string, command: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const exec = new Exec(this.kubeConfig);
      let stdout = '';
      let stderr = '';
      let isResolved = false;

      // Create writable streams to enable stdout/stderr capture
      const { Writable } = require('stream');

      const stdoutStream = new Writable({
        write(chunk: any, encoding: string, callback: Function) {
          stdout += chunk.toString();
          callback();
        }
      });

      const stderrStream = new Writable({
        write(chunk: any, encoding: string, callback: Function) {
          stderr += chunk.toString();
          callback();
        }
      });

      exec.exec(
        namespace,
        podName,
        containerName,
        command,
        stdoutStream,
        stderrStream,
        null,
        false,
        (status) => {
          if (isResolved) return;
          isResolved = true;

          if (status.status === 'Success' || status.status === 'Failure') {
            if (stdout) {
              console.log('Exec completed, stdout:', stdout.substring(0, 200));
              resolve(stdout);
            } else if (stderr) {
              console.error('Exec stderr:', stderr);
              reject(new Error(`Exec stderr: ${stderr}`));
            } else {
              resolve('');
            }
          } else {
            console.error('Exec status:', status);
            reject(new Error(`Exec failed: ${status.message || 'Unknown error'}`));
          }
        }
      ).catch((err) => {
        if (!isResolved) {
          isResolved = true;
          console.error('Exec error:', err);
          reject(err);
        }
      });
    });
  }

  async listDirectory(namespace: string, podName: string, containerName: string, path: string = '/'): Promise<DirectoryListingResponse> {
    try {
      // Use ls -lAh to get file details (hidden files, human-readable sizes)
      const output = await this.execInPod(namespace, podName, containerName, ['ls', '-lAh', path]);

      console.log('ls output:', output);

      const files: FileInfo[] = [];
      const lines = output.trim().split('\n');

      // Skip first line if it's "total ..."
      const startIndex = lines[0]?.startsWith('total') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse ls -l output: drwxr-xr-x 2 user group 4.0K Jan 1 12:00 filename
        const parts = line.split(/\s+/);

        // Need at least permissions, links, user, group, size, date parts, and filename
        if (parts.length < 7) continue;

        const permissions = parts[0];
        const size = parts[4];

        // Filename is everything after the date/time (handles filenames with spaces)
        // Date can be "Jan 1 12:00" or "Oct 8 22:46" - so we skip first 5-8 parts
        let nameStartIdx = 8;

        // If month is 3 chars, day is 1-2 digits, time is HH:MM, that's typically parts 5,6,7
        // So filename starts at part 8
        if (parts.length >= 9) {
          nameStartIdx = 8;
        } else if (parts.length >= 7) {
          nameStartIdx = 6;
        }

        const name = parts.slice(nameStartIdx).join(' ');

        // Skip . and .. and hidden files (starting with .)
        if (name === '.' || name === '..' || !name || name.startsWith('.')) continue;

        const type = permissions.startsWith('d') ? 'directory' : 'file';

        files.push({
          name,
          type,
          permissions,
          size: type === 'file' ? parseFloat(size) : undefined,
        });
      }

      console.log('Parsed files:', files);

      return { path, files };
    } catch (error) {
      console.error(`Error listing directory ${namespace}/${podName}:${path}:`, error);
      throw error;
    }
  }

  async readFileContent(namespace: string, podName: string, containerName: string, filePath: string): Promise<FileContentResponse> {
    try {
      const content = await this.execInPod(namespace, podName, containerName, ['cat', filePath]);

      return {
        path: filePath,
        content,
        size: Buffer.byteLength(content, 'utf8'),
      };
    } catch (error) {
      console.error(`Error reading file ${namespace}/${podName}:${filePath}:`, error);
      throw error;
    }
  }
}

export const kubernetesService = new KubernetesService();
