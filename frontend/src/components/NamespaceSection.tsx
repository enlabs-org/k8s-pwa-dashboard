import { useState, useEffect } from 'react';
import { Deployment } from '../types';
import { DeploymentCard } from './DeploymentCard';
import { useTheme, colors } from '../context/ThemeContext';

type SortOption = 'status' | 'name-asc' | 'name-desc' | 'replicas-desc';

interface NamespaceSectionProps {
  namespaceName: string;
  deployments: Deployment[];
  onScale: (namespace: string, name: string, replicas: number) => void;
  isScaling: (namespace: string, name: string) => boolean;
  scalingEnabled: boolean;
  forceCollapsed: boolean | null;
  onToggle: () => void;
  sortOption: SortOption;
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
  sortOption,
}: NamespaceSectionProps) {
  // Initialize as collapsed - use forceCollapsed if provided, otherwise default to true
  const [localCollapsed, setLocalCollapsed] = useState(() => forceCollapsed ?? true);
  const { theme } = useTheme();
  const c = colors[theme];

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
    switch (sortOption) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'replicas-desc':
        return b.replicas.desired - a.replicas.desired;
      case 'status':
      default:
        const orderDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
    }
  });

  const runningCount = deployments.filter((d) => d.status === 'running').length;
  const errorCount = deployments.filter((d) => d.status === 'error').length;

  return (
    <div
      style={{
        marginBottom: '16px',
        backgroundColor: c.bgCard,
        borderRadius: '8px',
        padding: '16px',
        boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'background-color 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
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
            color: c.textSecondary,
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }}
        >
          ▼
        </span>

        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: c.text }}>
          {namespaceName}
        </h2>

        <span style={{ fontSize: '14px', color: c.textSecondary }}>
          ({deployments.length} deployment{deployments.length !== 1 ? 's' : ''})
        </span>

        {errorCount > 0 && (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: theme === 'light' ? '#fee2e2' : '#7f1d1d',
              color: theme === 'light' ? '#991b1b' : '#fecaca',
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
              backgroundColor: theme === 'light' ? '#dcfce7' : '#14532d',
              color: theme === 'light' ? '#166534' : '#bbf7d0',
            }}
          >
            {runningCount} running
          </span>
        )}
      </div>

      {!isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          {sortedDeployments.length === 0 ? (
            <p style={{ color: c.textSecondary, fontStyle: 'italic' }}>No deployments in this namespace</p>
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
