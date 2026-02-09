import { Router, Request, Response } from 'express';
import { kubernetesService } from '../services/kubernetes';
import { getConfig } from '../config';
import { Deployment, DeploymentSummary, DeploymentsResponse, ScaleRequest, DeploymentDetail, PodLogsResponse, DirectoryListingResponse, FileContentResponse } from '../types';

const router = Router();

// Helper to check if namespace is allowed (not in exclude list)
function isNamespaceAllowed(namespace: string, excludeList: string[]): boolean {
  const excludeSet = new Set(excludeList.map(n => n.toLowerCase()));
  return !excludeSet.has(namespace.toLowerCase());
}

// GET /api/v1/deployments - List all deployments from all namespaces (except excluded)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    const namespaces = await kubernetesService.getNamespaces(config.excludeNamespaces);
    const allDeployments: Deployment[] = [];

    // Fetch deployments from all namespaces in parallel
    const results = await Promise.allSettled(
      namespaces.map(ns => kubernetesService.getDeployments(ns))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allDeployments.push(...result.value);
      }
    }

    // Calculate summary
    const summary: DeploymentSummary = {
      total: allDeployments.length,
      running: allDeployments.filter((d) => d.status === 'running').length,
      error: allDeployments.filter((d) => d.status === 'error').length,
      pending: allDeployments.filter((d) => d.status === 'pending').length,
      scaledToZero: allDeployments.filter((d) => d.status === 'scaled_to_zero').length,
    };

    const response: DeploymentsResponse = {
      deployments: allDeployments,
      summary,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch deployments',
      },
    });
  }
});

// GET /api/v1/deployments/:namespace/:name - Get single deployment with details
router.get('/:namespace/:name', async (req: Request, res: Response) => {
  try {
    const { namespace, name } = req.params;
    const config = getConfig();

    // Check if namespace is allowed
    if (!isNamespaceAllowed(namespace, config.excludeNamespaces)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'NAMESPACE_EXCLUDED',
          message: `Namespace ${namespace} is excluded`,
        },
      });
      return;
    }

    const deploymentDetail = await kubernetesService.getDeploymentDetail(namespace, name);

    if (!deploymentDetail) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Deployment ${namespace}/${name} not found`,
        },
      });
      return;
    }

    res.json({ success: true, data: deploymentDetail });
  } catch (error) {
    console.error('Error fetching deployment detail:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch deployment detail',
      },
    });
  }
});

// PATCH /api/v1/deployments/:namespace/:name/scale - Scale deployment
router.patch('/:namespace/:name/scale', async (req: Request, res: Response) => {
  try {
    const { namespace, name } = req.params;
    const { replicas } = req.body as ScaleRequest;
    const config = getConfig();

    // Check if scaling is enabled
    if (!config.settings.scalingEnabled) {
      res.status(403).json({
        success: false,
        error: {
          code: 'SCALING_DISABLED',
          message: 'Scaling is disabled in configuration',
        },
      });
      return;
    }

    // Check if namespace is allowed
    if (!isNamespaceAllowed(namespace, config.excludeNamespaces)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'NAMESPACE_EXCLUDED',
          message: `Namespace ${namespace} is excluded`,
        },
      });
      return;
    }

    // Validate replicas (only 0 or 1 allowed)
    if (typeof replicas !== 'number' || (replicas !== 0 && replicas !== 1)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REPLICAS',
          message: 'Replicas must be 0 or 1',
        },
      });
      return;
    }

    // Check if deployment exists
    const deployment = await kubernetesService.getDeployment(namespace, name);
    if (!deployment) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Deployment ${namespace}/${name} not found`,
        },
      });
      return;
    }

    // Scale deployment
    await kubernetesService.scaleDeployment(namespace, name, replicas);

    // Get updated deployment
    const updatedDeployment = await kubernetesService.getDeployment(namespace, name);

    res.json({
      success: true,
      data: updatedDeployment,
      message: `Deployment scaled to ${replicas} replica${replicas !== 1 ? 's' : ''}`,
    });
  } catch (error) {
    console.error('Error scaling deployment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SCALE_ERROR',
        message: 'Failed to scale deployment',
      },
    });
  }
});

// GET /api/v1/deployments/:namespace/:name/pods/:podName/logs - Get pod logs
router.get('/:namespace/:name/pods/:podName/logs', async (req: Request, res: Response) => {
  try {
    const { namespace, podName } = req.params;
    const tailLines = parseInt(req.query.tailLines as string) || 100;
    const containerName = req.query.container as string | undefined;
    const config = getConfig();

    // Check if namespace is allowed
    if (!isNamespaceAllowed(namespace, config.excludeNamespaces)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'NAMESPACE_EXCLUDED',
          message: `Namespace ${namespace} is excluded`,
        },
      });
      return;
    }

    const logs = await kubernetesService.getPodLogs(namespace, podName, containerName, tailLines);

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching pod logs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_LOGS_ERROR',
        message: 'Failed to fetch pod logs',
      },
    });
  }
});

// GET /api/v1/deployments/:namespace/:name/pods/:podName/files - List files in pod directory
router.get('/:namespace/:name/pods/:podName/files', async (req: Request, res: Response) => {
  try {
    const { namespace, podName } = req.params;
    const path = (req.query.path as string) || '/';
    const containerName = req.query.container as string;
    const config = getConfig();

    if (!containerName) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CONTAINER',
          message: 'Container name is required',
        },
      });
      return;
    }

    // Check if namespace is allowed
    if (!isNamespaceAllowed(namespace, config.excludeNamespaces)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'NAMESPACE_EXCLUDED',
          message: `Namespace ${namespace} is excluded`,
        },
      });
      return;
    }

    const listing = await kubernetesService.listDirectory(namespace, podName, containerName, path);

    res.json({ success: true, data: listing });
  } catch (error) {
    console.error('Error listing directory:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: 'Failed to list directory',
      },
    });
  }
});

// GET /api/v1/deployments/:namespace/:name/pods/:podName/files/download - Download file from pod
router.get('/:namespace/:name/pods/:podName/files/download', async (req: Request, res: Response) => {
  try {
    const { namespace, podName } = req.params;
    const filePath = req.query.path as string;
    const containerName = req.query.container as string;
    const config = getConfig();

    if (!filePath || !containerName) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'File path and container name are required',
        },
      });
      return;
    }

    // Check if namespace is allowed
    if (!isNamespaceAllowed(namespace, config.excludeNamespaces)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'NAMESPACE_EXCLUDED',
          message: `Namespace ${namespace} is excluded`,
        },
      });
      return;
    }

    const fileContent = await kubernetesService.readFileContent(namespace, podName, containerName, filePath);

    // Set headers for file download
    const filename = filePath.split('/').pop() || 'file';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(fileContent.content);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_ERROR',
        message: 'Failed to download file',
      },
    });
  }
});

export default router;
