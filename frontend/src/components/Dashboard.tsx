import { useMemo, useState } from 'react';
import { useDeployments } from '../hooks/useDeployments';
import { AppConfig, Deployment } from '../types';
import { NamespaceSection } from './NamespaceSection';
import { useTheme, colors } from '../context/ThemeContext';

interface DashboardProps {
  config: AppConfig;
}

export function Dashboard({ config }: DashboardProps) {
  const { deployments, summary, isLoading, error, scaleDeployment, isScaling, refetch } =
    useDeployments(config.settings.pollingInterval);

  const [collapsedAll, setCollapsedAll] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { theme } = useTheme();
  const c = colors[theme];

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
          backgroundColor: c.bgCard,
          borderRadius: '8px',
          boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)',
          marginBottom: '24px',
          flexWrap: 'wrap',
          transition: 'background-color 0.2s',
        }}
      >
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: c.text }}>{summary.total}</div>
          <div style={{ fontSize: '14px', color: c.textSecondary }}>Total</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{summary.running}</div>
          <div style={{ fontSize: '14px', color: c.textSecondary }}>Running</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{summary.error}</div>
          <div style={{ fontSize: '14px', color: c.textSecondary }}>Error</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#eab308' }}>{summary.pending}</div>
          <div style={{ fontSize: '14px', color: c.textSecondary }}>Pending</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: c.textSecondary }}>{summary.scaledToZero}</div>
          <div style={{ fontSize: '14px', color: c.textSecondary }}>Stopped</div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search deployments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: `1px solid ${c.inputBorder}`,
              borderRadius: '6px',
              fontSize: '14px',
              width: '200px',
              outline: 'none',
              backgroundColor: c.inputBg,
              color: c.text,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setCollapsedAll(false)}
            style={{
              padding: '8px 12px',
              backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
              color: theme === 'light' ? '#374151' : '#e5e7eb',
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
              backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
              color: theme === 'light' ? '#374151' : '#e5e7eb',
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
