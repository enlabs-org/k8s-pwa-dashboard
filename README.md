# K8s Preview App Dashboard

Simple web dashboard for monitoring and scaling Kubernetes deployments.

## Features

- **Dynamic namespace discovery** - automatically shows all namespaces except those in blacklist
- **Deployment status monitoring** - running, error, pending, stopped states
- **Start/Stop scaling** - scale deployments to 0 or 1 replica
- **Ingress URL extraction** - displays URLs from Ingress resources
- **Auto-refresh** - polling every 5 seconds (configurable)
- **Collapse/Expand** - organize view by namespace

## Quick Start

### Docker

```bash
docker pull ghcr.io/enlabs-org/k8s-pwa-dashboard:latest

# Run with local kubeconfig
docker run -p 3001:3001 -v ~/.kube:/root/.kube ghcr.io/enlabs-org/k8s-pwa-dashboard:latest
```

Open http://localhost:3001

### Kubernetes

```bash
# Clone and configure
git clone https://github.com/enlabs-org/k8s-pwa-dashboard.git
cd k8s-pwa-dashboard

# Edit configmap with your excluded namespaces
vim k8s/configmap.yaml

# Deploy
kubectl apply -f k8s/
```

Access via port-forward:
```bash
kubectl port-forward -n k8s-pwa-dashboard svc/k8s-pwa-dashboard 8080:80
```

## Configuration

Copy example config:
```bash
cp config/namespaces.yaml.example config/namespaces.yaml
```

Edit `config/namespaces.yaml`:
```yaml
version: "1.0"

# Namespaces to exclude (blacklist)
excludeNamespaces:
  - kube-system
  - kube-public
  - kube-node-lease
  - default

settings:
  pollingInterval: 5000    # ms
  scalingEnabled: true
```

Config auto-reloads on file change (no restart needed).

## Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000 (proxies API to backend)

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, TypeScript
- **K8s Client**: @kubernetes/client-node

## License

MIT
