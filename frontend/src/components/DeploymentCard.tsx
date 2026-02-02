import { Deployment } from '../types';
import { StatusBadge } from './StatusBadge';
import { ScaleControls } from './ScaleControls';

interface DeploymentCardProps {
  deployment: Deployment;
  onScale: (replicas: number) => void;
  isScaling: boolean;
  scalingEnabled: boolean;
}

export function DeploymentCard({ deployment, onScale, isScaling, scalingEnabled }: DeploymentCardProps) {
  const { name, status, replicas, urls } = deployment;

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </h3>
          <StatusBadge status={status} />
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6b7280', flexWrap: 'wrap' }}>
          <span>
            Replicas: <strong style={{ color: '#111827' }}>{replicas.ready}/{replicas.desired}</strong>
          </span>
          {replicas.unavailable > 0 && (
            <span style={{ color: '#dc2626' }}>
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
                  backgroundColor: '#eff6ff',
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
