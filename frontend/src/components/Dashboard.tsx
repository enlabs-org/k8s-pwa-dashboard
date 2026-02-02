import { useMemo, useState } from 'react';
import { useDeployments } from '../hooks/useDeployments';
import { AppConfig, Deployment } from '../types';
import { NamespaceSection } from './NamespaceSection';
import { useTheme, colors } from '../context/ThemeContext';

interface DashboardProps {
  config: AppConfig;
}

type StatusFilter = 'all' | 'running' | 'stopped';

export function Dashboard({ config }: DashboardProps) {
  const { deployments, summary, isLoading, error, scaleDeployment, isScaling, refetch } =
    useDeployments(config.settings.pollingInterval);

  const [collapsedAll, setCollapsedAll] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { theme } = useTheme();
  const c = colors[theme];

  // Get all unique namespaces for the filter dropdown
  const allNamespaces = useMemo(() => {
    const nsSet = new Set(deployments.map((d) => d.namespace));
    return Array.from(nsSet).sort();
  }, [deployments]);

  // Group deployments by namespace and get unique namespaces
  const { groupedDeployments, namespaces } = useMemo(() => {
    const grouped: Record<string, Deployment[]> = {};
    const search = searchTerm.toLowerCase().trim();

    for (const deployment of deployments) {
      // Filter by search term
      if (search && !deployment.name.toLowerCase().includes(search)) {
        continue;
      }

      // Filter by namespace
      if (namespaceFilter !== 'all' && deployment.namespace !== namespaceFilter) {
        continue;
      }

      // Filter by status
      if (statusFilter === 'running' && deployment.status !== 'running') {
        continue;
      }
      if (statusFilter === 'stopped' && deployment.status !== 'scaled_to_zero') {
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
  }, [deployments, searchTerm, namespaceFilter, statusFilter]);

  const handleScale = async (namespace: string, name: string, replicas: number) => {
    try {
      await scaleDeployment(namespace, name, replicas);
    } catch (err) {
      alert(`Failed to scale ${namespace}/${name}: ${(err as Error).message}`);
    }
  };

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: `1px solid ${c.inputBorder}`,
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: c.inputBg,
    color: c.text,
    cursor: 'pointer',
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

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: `1px solid ${c.inputBorder}`,
              borderRadius: '6px',
              fontSize: '14px',
              width: '140px',
              outline: 'none',
              backgroundColor: c.inputBg,
              color: c.text,
            }}
          />

          <select
            value={namespaceFilter}
            onChange={(e) => setNamespaceFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="all">All NS</option>
            {allNamespaces.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={selectStyle}
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
          </select>
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

      {/* Empty state */}
      {namespaces.length === 0 && !isLoading && !error && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            color: c.textSecondary,
          }}
        >
          No deployments match your filters
        </div>
      )}
    </div>
  );
}
