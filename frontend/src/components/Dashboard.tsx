import { useMemo, useState } from 'react';
import { useDeployments } from '../hooks/useDeployments';
import { AppConfig, Deployment } from '../types';
import { NamespaceSection } from './NamespaceSection';
import { DeploymentCard } from './DeploymentCard';
import { useTheme, colors } from '../context/ThemeContext';

interface DashboardProps {
  config: AppConfig;
}

type StatusFilter = 'all' | 'running' | 'stopped';
type SortOption = 'status' | 'name-asc' | 'name-desc' | 'replicas-desc';

export function Dashboard({ config }: DashboardProps) {
  const { deployments, summary, isLoading, error, scaleDeployment, isScaling, refetch } =
    useDeployments(config.settings.pollingInterval);

  const [collapsedAll, setCollapsedAll] = useState<boolean | null>(null);
  const [masterCollapsed, setMasterCollapsed] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('status');
  const { theme } = useTheme();
  const c = colors[theme];

  // Get all unique namespaces for the filter dropdown
  const allNamespaces = useMemo(() => {
    const nsSet = new Set(deployments.map((d) => d.namespace));
    return Array.from(nsSet).sort();
  }, [deployments]);

  // Separate master deployments and regular deployments
  const { masterDeployments, groupedDeployments, namespaces } = useMemo(() => {
    const masters: Deployment[] = [];
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

      // Separate master deployments
      if (deployment.name.toLowerCase().includes('master')) {
        masters.push(deployment);
        continue;
      }

      if (!grouped[deployment.namespace]) {
        grouped[deployment.namespace] = [];
      }
      grouped[deployment.namespace].push(deployment);
    }

    // Sort namespaces alphabetically
    const nsList = Object.keys(grouped).sort();

    // Sort masters by status then name
    masters.sort((a, b) => {
      const statusOrder: Record<string, number> = { running: 0, pending: 1, error: 2, scaled_to_zero: 3 };
      const orderDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });

    return { masterDeployments: masters, groupedDeployments: grouped, namespaces: nsList };
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

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            style={selectStyle}
          >
            <option value="status">Sort: Status</option>
            <option value="name-asc">Sort: Name A-Z</option>
            <option value="name-desc">Sort: Name Z-A</option>
            <option value="replicas-desc">Sort: Replicas</option>
          </select>

          {(searchTerm || namespaceFilter !== 'all' || statusFilter !== 'all' || sortOption !== 'status') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setNamespaceFilter('all');
                setStatusFilter('all');
                setSortOption('status');
              }}
              style={{
                padding: '8px 12px',
                backgroundColor: theme === 'light' ? '#fee2e2' : '#7f1d1d',
                color: theme === 'light' ? '#991b1b' : '#fecaca',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              title="Clear all filters"
            >
              ✕
            </button>
          )}
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

      {/* Master Stagings Section */}
      {masterDeployments.length > 0 && (
        <div
          style={{
            marginBottom: '24px',
            padding: '12px 16px',
            backgroundColor: theme === 'light' ? '#fefce8' : '#422006',
            borderRadius: '8px',
            border: `1px solid ${theme === 'light' ? '#fef08a' : '#854d0e'}`,
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
            onClick={() => setMasterCollapsed(!masterCollapsed)}
          >
            <span
              style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                lineHeight: '20px',
                textAlign: 'center',
                fontSize: '12px',
                color: theme === 'light' ? '#854d0e' : '#fef08a',
                transform: masterCollapsed ? 'rotate(-90deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }}
            >
              ▼
            </span>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: theme === 'light' ? '#854d0e' : '#fef08a' }}>
              ⭐ Master Stagings
            </h2>
            <span style={{ fontSize: '14px', color: c.textSecondary }}>
              ({masterDeployments.length})
            </span>
            {masterDeployments.some(d => d.status === 'error') && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: theme === 'light' ? '#fee2e2' : '#7f1d1d',
                  color: theme === 'light' ? '#991b1b' : '#fecaca',
                }}
              >
                {masterDeployments.filter(d => d.status === 'error').length} error
              </span>
            )}
            {masterDeployments.every(d => d.status === 'running') && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: theme === 'light' ? '#dcfce7' : '#14532d',
                  color: theme === 'light' ? '#166534' : '#bbf7d0',
                }}
              >
                ✓ All running
              </span>
            )}
          </div>
          {!masterCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {masterDeployments.map((deployment) => (
                <DeploymentCard
                  key={`${deployment.namespace}/${deployment.name}`}
                  deployment={deployment}
                  onScale={() => {}}
                  isScaling={false}
                  scalingEnabled={false}
                />
              ))}
            </div>
          )}
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
          sortOption={sortOption}
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
