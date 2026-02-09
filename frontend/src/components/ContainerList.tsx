import { ContainerInfo } from '../types';
import { useTheme, colors } from '../context/ThemeContext';

interface ContainerListProps {
  containers: ContainerInfo[];
}

export function ContainerList({ containers }: ContainerListProps) {
  const { theme } = useTheme();
  const c = colors[theme];

  if (containers.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: c.bgCard,
        borderRadius: '8px',
        boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)',
        marginBottom: '24px',
        transition: 'background-color 0.2s',
      }}
    >
      <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: c.text }}>
        Containers
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {containers.map((container) => (
          <div
            key={container.name}
            style={{
              padding: '16px',
              backgroundColor: theme === 'light' ? '#f9fafb' : '#111827',
              borderRadius: '6px',
              border: `1px solid ${c.border}`,
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: c.text }}>
                {container.name}
              </h3>
              <div style={{ fontSize: '13px', color: c.textSecondary, fontFamily: 'monospace' }}>
                {container.image}
                <span
                  style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    backgroundColor: theme === 'light' ? '#e0e7ff' : '#312e81',
                    color: theme === 'light' ? '#4338ca' : '#a5b4fc',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {container.imageTag}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
              }}
            >
              {(container.resources.requests?.cpu || container.resources.requests?.memory) && (
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: c.textSecondary,
                      marginBottom: '4px',
                      fontWeight: 600,
                    }}
                  >
                    REQUESTS
                  </div>
                  <div style={{ fontSize: '13px', color: c.text }}>
                    {container.resources.requests?.cpu && (
                      <div>
                        CPU:{' '}
                        <code
                          style={{
                            backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
                            padding: '2px 4px',
                            borderRadius: '3px',
                          }}
                        >
                          {container.resources.requests.cpu}
                        </code>
                      </div>
                    )}
                    {container.resources.requests?.memory && (
                      <div>
                        Memory:{' '}
                        <code
                          style={{
                            backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
                            padding: '2px 4px',
                            borderRadius: '3px',
                          }}
                        >
                          {container.resources.requests.memory}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(container.resources.limits?.cpu || container.resources.limits?.memory) && (
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: c.textSecondary,
                      marginBottom: '4px',
                      fontWeight: 600,
                    }}
                  >
                    LIMITS
                  </div>
                  <div style={{ fontSize: '13px', color: c.text }}>
                    {container.resources.limits?.cpu && (
                      <div>
                        CPU:{' '}
                        <code
                          style={{
                            backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
                            padding: '2px 4px',
                            borderRadius: '3px',
                          }}
                        >
                          {container.resources.limits.cpu}
                        </code>
                      </div>
                    )}
                    {container.resources.limits?.memory && (
                      <div>
                        Memory:{' '}
                        <code
                          style={{
                            backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
                            padding: '2px 4px',
                            borderRadius: '3px',
                          }}
                        >
                          {container.resources.limits.memory}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
