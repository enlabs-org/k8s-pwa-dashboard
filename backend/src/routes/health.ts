import { Router, Request, Response } from 'express';
import { kubernetesService } from '../services/kubernetes';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const connected = await kubernetesService.isConnected();
    const serverVersion = connected ? await kubernetesService.getServerVersion() : 'unknown';

    res.json({
      status: connected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      kubernetes: {
        connected,
        serverVersion,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      kubernetes: {
        connected: false,
        serverVersion: 'unknown',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
