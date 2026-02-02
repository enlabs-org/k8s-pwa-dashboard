import { AppConfig, DeploymentsResponse, Deployment } from '../types';

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
