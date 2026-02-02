import express from 'express';
import cors from 'cors';
import { getConfig } from './config';
import healthRouter from './routes/health';
import deploymentsRouter from './routes/deployments';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Load config on startup
const config = getConfig();
console.log(`Loaded config, excluding namespaces: ${config.excludeNamespaces.join(', ')}`);

// API Routes
app.get('/api/v1/config', (_req, res) => {
  const config = getConfig();
  res.json({
    excludeNamespaces: config.excludeNamespaces,
    settings: {
      pollingInterval: config.settings.pollingInterval,
      scalingEnabled: config.settings.scalingEnabled,
    },
  });
});

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/deployments', deploymentsRouter);

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`K8s Dashboard Backend running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`Deployments: http://localhost:${PORT}/api/v1/deployments`);
});
