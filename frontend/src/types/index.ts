export interface Settings {
  pollingInterval: number;
  scalingEnabled: boolean;
}

export interface AppConfig {
  excludeNamespaces: string[];
  settings: Settings;
}

export type DeploymentStatus = 'running' | 'error' | 'pending' | 'scaled_to_zero';

export interface ReplicaInfo {
  desired: number;
  ready: number;
  available: number;
  unavailable: number;
}

export interface Deployment {
  name: string;
  namespace: string;
  status: DeploymentStatus;
  replicas: ReplicaInfo;
  labels: Record<string, string>;
  createdAt: string;
  urls: string[];
}

export interface DeploymentSummary {
  total: number;
  running: number;
  error: number;
  pending: number;
  scaledToZero: number;
}

export interface DeploymentsResponse {
  deployments: Deployment[];
  summary: DeploymentSummary;
  timestamp: string;
}
