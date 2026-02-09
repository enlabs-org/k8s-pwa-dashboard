import { PodInfo } from '../types';
import { useTheme, colors } from '../context/ThemeContext';

interface PodListProps {
  pods: PodInfo[];
}

function getPodStatusColor(status: string, theme: 'light' | 'dark'): { bg: string; text: string } {
  const statusLower = status.toLowerCase();

  if (statusLower === 'running') {
    return theme === 'light'
      ? { bg: '#dcfce7', text: '#166534' }
      : { bg: '#14532d', text: '#bbf7d0' };
  }
  if (statusLower === 'pending') {
    return theme === 'light'
      ? { bg: '#fef9c3', text: '#854d0e' }
      : { bg: '#713f12', text: '#fef08a' };
  }
  if (statusLower.includes('error') || statusLower === 'failed') {
    return theme === 'light'
      ? { bg: '#fee2e2', text: '#991b1b' }
      : { bg: '#7f1d1d', text: '#fecaca' };
  }

  return theme === 'light'
    ? { bg: '#e5e7eb', text: '#374151' }
    : { bg: '#374151', text: '#9ca3af' };
}

export function PodList({ pods }: PodListProps) {
  const { theme } = useTheme();
  const c = colors[theme];

  if (pods.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: c.bgCard,
          borderRadius: '8px',
          boxShadow:
            theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'background-color 0.2s',
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: c.text }}>
          Pods
        </h2>
        <div style={{ textAlign: 'center', padding: '24px', color: c.textSecondary }}>
          No pods found
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: c.bgCard,
        borderRadius: '8px',
        boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'background-color 0.2s',
      }}
    >
      <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: c.text }}>
        Pods ({pods.length})
      </h2>

      {/* Desktop Table View */}
      <div
        style={{
          display: 'block',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${c.border}` }}>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: c.textSecondary,
                }}
              >
                NAME
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: c.textSecondary,
                }}
              >
                STATUS
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: c.textSecondary,
                }}
              >
                RESTARTS
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: c.textSecondary,
                }}
              >
                AGE
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: c.textSecondary,
                }}
              >
                CONTAINERS
              </th>
            </tr>
          </thead>
          <tbody>
            {pods.map((pod) => {
              const statusColors = getPodStatusColor(pod.status, theme);
              return (
                <tr key={pod.name} style={{ borderBottom: `1px solid ${c.border}` }}>
                  <td
                    style={{
                      padding: '12px',
                      fontSize: '13px',
                      color: c.text,
                      fontFamily: 'monospace',
                    }}
                  >
                    {pod.name}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: statusColors.bg,
                        color: statusColors.text,
                      }}
                    >
                      {pod.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: c.text }}>
                    {pod.restartCount > 0 ? (
                      <span style={{ color: pod.restartCount > 5 ? '#ef4444' : '#eab308' }}>
                        {pod.restartCount}
                      </span>
                    ) : (
                      pod.restartCount
                    )}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: c.text }}>{pod.age}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: c.textSecondary }}>
                    {pod.containerStatuses.map((cs, idx) => (
                      <div
                        key={idx}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: cs.ready ? '#22c55e' : '#ef4444',
                            display: 'inline-block',
                          }}
                        />
                        <span>{cs.name}</span>
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
