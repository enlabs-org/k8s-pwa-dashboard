import { AppConfig, DeploymentsResponse, Deployment, DeploymentDetail, PodLogsResponse, DirectoryListingResponse } from '../types';

const API_BASE = '/api/v1';

export async function fetchConfig(): Promise<AppConfig> {
  const response = await fetch(`${API_BASE}/config`);
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  return response.json();
}

export async function fetchDeployments(): Promise<DeploymentsResponse> {
  const response = await fetch(`${API_BASE}/deployments`);
  if (!response.ok) {
    throw new Error('Failed to fetch deployments');
  }
  return response.json();
}

export async function scaleDeployment(
  namespace: string,
  name: string,
  replicas: number
): Promise<Deployment> {
  const response = await fetch(`${API_BASE}/deployments/${namespace}/${name}/scale`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ replicas }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to scale deployment');
  }

  const result = await response.json();
  return result.data;
}

export async function fetchDeploymentDetail(
  namespace: string,
  name: string
): Promise<DeploymentDetail> {
  const response = await fetch(`${API_BASE}/deployments/${namespace}/${name}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch deployment detail');
  }
  const result = await response.json();
  return result.data;
}

export async function fetchPodLogs(
  namespace: string,
  deploymentName: string,
  podName: string,
  containerName?: string,
  tailLines: number = 100
): Promise<PodLogsResponse> {
  const params = new URLSearchParams({ tailLines: tailLines.toString() });
  if (containerName) {
    params.append('container', containerName);
  }

  const response = await fetch(
    `${API_BASE}/deployments/${namespace}/${deploymentName}/pods/${podName}/logs?${params}`
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch pod logs');
  }
  const result = await response.json();
  return result.data;
}

export async function fetchPodFiles(
  namespace: string,
  deploymentName: string,
  podName: string,
  containerName: string,
  path: string = '/'
): Promise<DirectoryListingResponse> {
  const params = new URLSearchParams({ path, container: containerName });

  const response = await fetch(
    `${API_BASE}/deployments/${namespace}/${deploymentName}/pods/${podName}/files?${params}`
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch pod files');
  }
  const result = await response.json();
  return result.data;
}

export function downloadPodFile(
  namespace: string,
  deploymentName: string,
  podName: string,
  containerName: string,
  filePath: string
): void {
  const params = new URLSearchParams({ path: filePath, container: containerName });
  const url = `${API_BASE}/deployments/${namespace}/${deploymentName}/pods/${podName}/files/download?${params}`;

  // Open in new window to trigger download
  window.open(url, '_blank');
}
