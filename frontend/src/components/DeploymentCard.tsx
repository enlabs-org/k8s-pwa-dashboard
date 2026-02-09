import { useNavigate } from 'react-router-dom';
import { Deployment } from '../types';
import { StatusBadge } from './StatusBadge';
import { ScaleControls } from './ScaleControls';
import { useTheme, colors } from '../context/ThemeContext';

interface DeploymentCardProps {
  deployment: Deployment;
  onScale: (replicas: number) => void;
  isScaling: boolean;
  scalingEnabled: boolean;
}

export function DeploymentCard({ deployment, onScale, isScaling, scalingEnabled }: DeploymentCardProps) {
  const { name, namespace, status, replicas, urls } = deployment;
  const { theme } = useTheme();
  const c = colors[theme];
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on links or buttons
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'A' ||
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }
    navigate(`/deployments/${namespace}/${name}`);
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        padding: '16px',
        backgroundColor: c.bgCard,
        borderRadius: '8px',
        boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          theme === 'light' ? '0 4px 6px rgba(0,0,0,0.15)' : '0 4px 6px rgba(0,0,0,0.5)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow =
          theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: c.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </h3>
          <StatusBadge status={status} />
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: c.textSecondary, flexWrap: 'wrap' }}>
          <span>
            Replicas: <strong style={{ color: c.text }}>{replicas.ready}/{replicas.desired}</strong>
          </span>
          {replicas.unavailable > 0 && (
            <span style={{ color: '#ef4444' }}>
              Unavailable: {replicas.unavailable}
            </span>
          )}
        </div>

        {urls.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            {urls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  color: '#3b82f6',
                  textDecoration: 'none',
                  padding: '2px 6px',
                  backgroundColor: theme === 'light' ? '#eff6ff' : '#1e3a5f',
                  borderRadius: '4px',
                }}
              >
                {url.replace(/^https?:\/\//, '')}
              </a>
            ))}
          </div>
        )}
      </div>

      <ScaleControls
        currentReplicas={replicas.desired}
        onScale={onScale}
        isScaling={isScaling}
        disabled={!scalingEnabled}
      />
    </div>
  );
}
