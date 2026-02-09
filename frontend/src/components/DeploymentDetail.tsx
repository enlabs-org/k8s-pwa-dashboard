import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchDeploymentDetail,
  scaleDeployment as apiScaleDeployment,
} from '../api/deployments';
import { DeploymentDetail as DeploymentDetailType, AppConfig } from '../types';
import { StatusBadge } from './StatusBadge';
import { ScaleControls } from './ScaleControls';
import { PodList } from './PodList';
import { ContainerList } from './ContainerList';
import { PodLogs } from './PodLogs';
import { FileBrowser } from './FileBrowser';
import { useTheme, colors } from '../context/ThemeContext';

interface DeploymentDetailProps {
  config: AppConfig;
}

export function DeploymentDetail({ config }: DeploymentDetailProps) {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const { theme } = useTheme();
  const c = colors[theme];

  const [deployment, setDeployment] = useState<DeploymentDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isScaling, setIsScaling] = useState(false);

  useEffect(() => {
    if (!namespace || !name) return;

    setIsLoading(true);
    setError(null);

    fetchDeploymentDetail(namespace, name)
      .then(setDeployment)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [namespace, name]);

  const handleScale = async (replicas: number) => {
    if (!namespace || !name || !deployment) return;

    setIsScaling(true);
    try {
      await apiScaleDeployment(namespace, name, replicas);
      // Refetch after scaling
      const updated = await fetchDeploymentDetail(namespace, name);
      setDeployment(updated);
    } catch (err) {
      alert(`Failed to scale: ${(err as Error).message}`);
    } finally {
      setIsScaling(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: c.textSecondary }}>
        Loading deployment details...
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginBottom: '16px',
            color: '#3b82f6',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          ← Back to Dashboard
        </Link>
        <div
          style={{
            padding: '24px',
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            color: '#991b1b',
          }}
        >
          <h2 style={{ margin: '0 0 8px' }}>Failed to load deployment</h2>
          <p style={{ margin: 0 }}>{error?.message || 'Deployment not found'}</p>
        </div>
      </div>
    );
  }

  const { replicas, status, urls, pods, containers } = deployment;

  // Determine header background color based on status
  const getHeaderColors = () => {
    switch (status) {
      case 'running':
        return theme === 'light'
          ? { bg: '#dcfce7', text: '#166534', secondaryText: '#15803d' }
          : { bg: '#14532d', text: '#bbf7d0', secondaryText: '#86efac' };
      case 'error':
        return theme === 'light'
          ? { bg: '#fee2e2', text: '#991b1b', secondaryText: '#b91c1c' }
          : { bg: '#7f1d1d', text: '#fecaca', secondaryText: '#fca5a5' };
      case 'scaled_to_zero':
        return theme === 'light'
          ? { bg: '#e0e7ff', text: '#3730a3', secondaryText: '#4f46e5' }
          : { bg: '#312e81', text: '#c7d2fe', secondaryText: '#a5b4fc' };
      case 'pending':
        return theme === 'light'
          ? { bg: '#fef9c3', text: '#854d0e', secondaryText: '#a16207' }
          : { bg: '#713f12', text: '#fef08a', secondaryText: '#fde047' };
      default:
        return { bg: c.bgCard, text: c.text, secondaryText: c.textSecondary };
    }
  };

  const headerColors = getHeaderColors();

  return (
    <div>
      {/* Back Button */}
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          padding: '8px 12px',
          backgroundColor: c.bgCard,
          color: c.text,
          textDecoration: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow:
            theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'background-color 0.2s',
        }}
      >
        <span>←</span>
        <span>Back to Dashboard</span>
      </Link>

      {/* Header Card */}
      <div
        style={{
          padding: '24px',
          backgroundColor: headerColors.bg,
          borderRadius: '8px',
          boxShadow:
            theme === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)',
          marginBottom: '24px',
          transition: 'background-color 0.2s',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}
            >
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: headerColors.text }}>
                {name}
              </h1>
              <StatusBadge status={status} />
            </div>
            <div style={{ fontSize: '14px', color: headerColors.secondaryText, marginBottom: '8px' }}>
              <strong>Namespace:</strong> {namespace}
            </div>
            <div style={{ fontSize: '14px', color: headerColors.secondaryText }}>
              <strong>Replicas:</strong>{' '}
              <span style={{ color: headerColors.text }}>
                {replicas.ready}/{replicas.desired}
              </span>
              {replicas.unavailable > 0 && (
                <span style={{ color: status === 'error' ? headerColors.text : '#ef4444', marginLeft: '8px' }}>
                  ({replicas.unavailable} unavailable)
                </span>
              )}
            </div>
          </div>

          {/* Scale Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ScaleControls
              currentReplicas={replicas.desired}
              onScale={handleScale}
              isScaling={isScaling}
              disabled={!config.settings.scalingEnabled}
            />
          </div>
        </div>

        {/* URLs */}
        {urls.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: `1px solid ${status === 'running' ? (theme === 'light' ? '#86efac' : '#166534') : status === 'error' ? (theme === 'light' ? '#fca5a5' : '#991b1b') : theme === 'light' ? '#d1d5db' : '#4b5563'}`,
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: headerColors.secondaryText,
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              URLS
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {urls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '14px',
                    color: '#3b82f6',
                    textDecoration: 'none',
                    padding: '6px 12px',
                    backgroundColor: theme === 'light' ? '#eff6ff' : '#1e3a5f',
                    borderRadius: '6px',
                  }}
                >
                  {url.replace(/^https?:\/\//, '')}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Containers + Pods */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ContainerList containers={containers} />
          <PodList pods={pods} />
        </div>

        {/* Right Column: Logs + File Browser */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PodLogs namespace={namespace!} deploymentName={name!} pods={pods} />
          <FileBrowser namespace={namespace!} deploymentName={name!} pods={pods} />
        </div>
      </div>
    </div>
  );
}
