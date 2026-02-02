import { useMemo, useState } from 'react';
import { useDeployments } from '../hooks/useDeployments';
import { AppConfig, Deployment } from '../types';
import { NamespaceSection } from './NamespaceSection';

interface DashboardProps {
  config: AppConfig;
}

export function Dashboard({ config }: DashboardProps) {
  const { deployments, summary, isLoading, error, scaleDeployment, isScaling, refetch } =
    useDeployments(config.settings.pollingInterval);

  const [collapsedAll, setCollapsedAll] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Group deployments by namespace and get unique namespaces
  const { groupedDeployments, namespaces } = useMemo(() => {
    const grouped: Record<string, Deployment[]> = {};
    const search = searchTerm.toLowerCase().trim();

    for (const deployment of deployments) {
      // Filter by search term
      if (search && !deployment.name.toLowerCase().includes(search)) {
        continue;
      }

      if (!grouped[deployment.namespace]) {
        grouped[deployment.namespace] = [];
      }
      grouped[deployment.namespace].push(deployment);
    }

    // Sort namespaces alphabetically
    const nsList = Object.keys(grouped).sort();

    return { groupedDeployments: grouped, namespaces: nsList };
  }, [deployments, searchTerm]);

  const handleScale = async (namespace: string, name: string, replicas: number) => {
    try {
      await scaleDeployment(namespace, name, replicas);
    } catch (err) {
      alert(`Failed to scale ${namespace}/${name}: ${(err as Error).message}`);
    }
  };

  return (
    <div>
      {/* Summary Bar */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          padding: '16px 24px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>{summary.total}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Total</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534' }}>{summary.running}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Running</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#991b1b' }}>{summary.error}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Error</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#854d0e' }}>{summary.pending}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#374151' }}>{summary.scaledToZero}</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Stopped</div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search deployments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              width: '200px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setCollapsedAll(false)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Expand All
          </button>
          <button
            onClick={() => setCollapsedAll(true)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Collapse All
          </button>
          <button
            onClick={refetch}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            color: '#991b1b',
            marginBottom: '24px',
          }}
        >
          Error loading deployments: {error.message}
        </div>
      )}

      {/* Namespace Sections */}
      {namespaces.map((ns) => (
        <NamespaceSection
          key={ns}
          namespaceName={ns}
          deployments={groupedDeployments[ns] || []}
          onScale={handleScale}
          isScaling={isScaling}
          scalingEnabled={config.settings.scalingEnabled}
          forceCollapsed={collapsedAll}
          onToggle={() => setCollapsedAll(null)}
        />
      ))}
    </div>
  );
}
