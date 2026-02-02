import * as k8s from '@kubernetes/client-node';
import { Deployment, DeploymentStatus, ReplicaInfo } from '../types';

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
      const items = response.body?.items ?? response.items ?? [];
      const excludeSet = new Set(excludeList.map(n => n.toLowerCase()));

      return (items as k8s.V1Namespace[])
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
      return response.gitVersion ?? 'unknown';
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
      const items = deploymentsRes.body?.items ?? deploymentsRes.items ?? [];
      return items.map((item: k8s.V1Deployment) => {
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
      const deployment = response.body ?? response;
      return this.mapDeployment(deployment as k8s.V1Deployment);
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
      const scale = scaleRes.body ?? scaleRes;

      // Update replicas
      (scale as k8s.V1Scale).spec = { replicas };

      // Replace scale
      await this.appsApi.replaceNamespacedDeploymentScale(name, namespace, scale as k8s.V1Scale);
    } catch (error) {
      console.error(`Error scaling deployment ${namespace}/${name}:`, error);
      throw error;
    }
  }

  async getIngressUrls(namespace: string): Promise<Map<string, string[]>> {
    const urlMap = new Map<string, string[]>();
    try {
      const response = await this.networkingApi.listNamespacedIngress(namespace);
      const items = response.body?.items ?? response.items ?? [];

      for (const ingress of items as k8s.V1Ingress[]) {
        const release = ingress.metadata?.labels?.['release'] ?? ingress.metadata?.name;
        if (!release) continue;

        const urls: string[] = [];
        const rules = ingress.spec?.rules ?? [];
        const hasTls = (ingress.spec?.tls?.length ?? 0) > 0;

        for (const rule of rules) {
          if (rule.host) {
            const protocol = hasTls ? 'https' : 'http';
            urls.push(`${protocol}://${rule.host}`);
          }
        }

        if (urls.length > 0) {
          urlMap.set(release, urls);
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
}

export const kubernetesService = new KubernetesService();
