export interface NamespaceInfo {
  name: string;
  displayName: string;
}

export interface Settings {
  pollingInterval: number;
  scalingEnabled: boolean;
}

export interface AppConfig {
  version: string;
  excludeNamespaces: string[];
  settings: Settings;
}

export interface RuntimeConfig {
  namespaces: NamespaceInfo[];
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

export interface ScaleRequest {
  replicas: number;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ContainerStatus {
  name: string;
  ready: boolean;
  restartCount: number;
  state: string;
}

export interface PodInfo {
  name: string;
  status: string;
  restartCount: number;
  age: string;
  containerStatuses: ContainerStatus[];
}

export interface ContainerInfo {
  name: string;
  image: string;
  imageTag: string;
  resources: {
    limits?: {
      cpu?: string;
      memory?: string;
    };
    requests?: {
      cpu?: string;
      memory?: string;
    };
  };
}

export interface DeploymentDetail extends Deployment {
  pods: PodInfo[];
  containers: ContainerInfo[];
}

export interface PodLogsResponse {
  podName: string;
  logs: string;
  timestamp: string;
}

export interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  permissions?: string;
  modifiedAt?: string;
}

export interface DirectoryListingResponse {
  path: string;
  files: FileInfo[];
}

export interface FileContentResponse {
  path: string;
  content: string;
  size: number;
}
