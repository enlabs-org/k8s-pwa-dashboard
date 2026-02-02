import { useState, useEffect } from 'react';
import { Deployment } from '../types';
import { DeploymentCard } from './DeploymentCard';

interface NamespaceSectionProps {
  namespaceName: string;
  deployments: Deployment[];
  onScale: (namespace: string, name: string, replicas: number) => void;
  isScaling: (namespace: string, name: string) => boolean;
  scalingEnabled: boolean;
  forceCollapsed: boolean | null;
  onToggle: () => void;
}

const statusOrder: Record<string, number> = {
  running: 0,
  pending: 1,
  error: 2,
  scaled_to_zero: 3,
};

export function NamespaceSection({
  namespaceName,
  deployments,
  onScale,
  isScaling,
  scalingEnabled,
  forceCollapsed,
  onToggle,
}: NamespaceSectionProps) {
  const [localCollapsed, setLocalCollapsed] = useState(false);

  // Sync local state when global state changes
  useEffect(() => {
    if (forceCollapsed !== null) {
      setLocalCollapsed(forceCollapsed);
    }
  }, [forceCollapsed]);

  const isCollapsed = localCollapsed;

  const handleToggle = () => {
    setLocalCollapsed(!localCollapsed);
    onToggle(); // Reset global state when manually toggling
  };

  const sortedDeployments = [...deployments].sort((a, b) => {
    const orderDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });

  const runningCount = deployments.filter((d) => d.status === 'running').length;
  const errorCount = deployments.filter((d) => d.status === 'error').length;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={handleToggle}
      >
        <span
          style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            lineHeight: '20px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280',
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }}
        >
          ▼
        </span>

        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
          {namespaceName}
        </h2>

        <span style={{ fontSize: '14px', color: '#6b7280' }}>
          ({deployments.length} deployment{deployments.length !== 1 ? 's' : ''})
        </span>

        {errorCount > 0 && (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
            }}
          >
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </span>
        )}

        {runningCount > 0 && (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: '#dcfce7',
              color: '#166534',
            }}
          >
            {runningCount} running
          </span>
        )}
      </div>

      {!isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '32px' }}>
          {sortedDeployments.length === 0 ? (
            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No deployments in this namespace</p>
          ) : (
            sortedDeployments.map((deployment) => (
              <DeploymentCard
                key={`${deployment.namespace}/${deployment.name}`}
                deployment={deployment}
                onScale={(replicas) => onScale(deployment.namespace, deployment.name, replicas)}
                isScaling={isScaling(deployment.namespace, deployment.name)}
                scalingEnabled={scalingEnabled}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
