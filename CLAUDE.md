# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

K8s Dashboard - a web dashboard for monitoring and scaling Kubernetes deployments. Single container serving both React frontend and Express API backend.

## Development Commands

```bash
# Backend development (from project root)
cd backend && npm install && npm run dev

# Frontend development (from project root)
cd frontend && npm install && npm run dev

# Build Docker image
docker build -t k8s-dashboard .

# Run locally with Docker (needs kubeconfig)
docker run -p 3001:3001 -v ~/.kube:/root/.kube k8s-dashboard

# Deploy to Kubernetes
kubectl apply -f k8s/
```

## Architecture

**Backend** (`backend/src/`):
- `index.ts` - Express server, serves API + static frontend files
- `services/kubernetes.ts` - K8s client wrapper using `@kubernetes/client-node`, handles deployment listing/scaling and ingress URL extraction
- `routes/deployments.ts` - REST API for deployments (GET list, GET detail, PATCH scale)
- `config/index.ts` - YAML config loader with file watcher for auto-reload

**Frontend** (`frontend/src/`):
- `hooks/useDeployments.ts` - Main data hook with polling and optimistic updates
- `hooks/usePolling.ts` - Generic polling hook
- `components/Dashboard.tsx` - Main view, groups deployments by namespace
- `components/NamespaceSection.tsx` - Collapsible namespace section with deployment cards

**Key Data Flow**:
1. Backend dynamically discovers namespaces from K8s API (minus excludeList from config)
2. Fetches deployments + ingress URLs in parallel for each namespace
3. Frontend polls `/api/v1/deployments` every 5s
4. Scale operations use optimistic UI updates with rollback on error

## Configuration

Copy `config/namespaces.yaml.example` to `config/namespaces.yaml`. The config uses a blacklist approach - all namespaces are shown except those in `excludeNamespaces`. Config auto-reloads on file change.

## Kubernetes Auth

- **In-cluster**: Uses ServiceAccount token automatically mounted at `/var/run/secrets/kubernetes.io/serviceaccount/token`
- **Local dev**: Uses `~/.kube/config` (same as kubectl)

Detection is automatic based on `KUBERNETES_SERVICE_HOST` env var.
