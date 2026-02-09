import { useState, useEffect } from 'react';
import { fetchPodLogs } from '../api/deployments';
import { PodInfo } from '../types';
import { useTheme, colors } from '../context/ThemeContext';

interface PodLogsProps {
  namespace: string;
  deploymentName: string;
  pods: PodInfo[];
}

export function PodLogs({ namespace, deploymentName, pods }: PodLogsProps) {
  const { theme } = useTheme();
  const c = colors[theme];

  const [selectedPod, setSelectedPod] = useState<string>('');
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [logs, setLogs] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get current pod object
  const currentPod = pods.find((p) => p.name === selectedPod);
  const containers = currentPod?.containerStatuses || [];

  // Select first pod by default
  useEffect(() => {
    if (pods.length > 0 && !selectedPod) {
      setSelectedPod(pods[0].name);
    }
  }, [pods, selectedPod]);

  // Select first container when pod changes
  useEffect(() => {
    if (currentPod && containers.length > 0) {
      setSelectedContainer(containers[0].name);
    }
  }, [currentPod]);

  // Load logs when pod or container is selected
  useEffect(() => {
    if (!selectedPod || !selectedContainer) return;

    setIsLoading(true);
    setError(null);

    fetchPodLogs(namespace, deploymentName, selectedPod, selectedContainer, 100)
      .then((response) => setLogs(response.logs))
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [namespace, deploymentName, selectedPod, selectedContainer]);

  const handleRefresh = () => {
    if (!selectedPod || !selectedContainer) return;

    setIsLoading(true);
    setError(null);

    fetchPodLogs(namespace, deploymentName, selectedPod, selectedContainer, 100)
      .then((response) => setLogs(response.logs))
      .catch(setError)
      .finally(() => setIsLoading(false));
  };

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
          Logs
        </h2>
        <div style={{ textAlign: 'center', padding: '24px', color: c.textSecondary }}>
          No pods available
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: c.text }}>Logs</h2>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', color: c.textSecondary, fontWeight: 500 }}>
              Pod:
            </label>
            <select
              value={selectedPod}
              onChange={(e) => setSelectedPod(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${c.border}`,
                backgroundColor: theme === 'light' ? '#fff' : '#1f2937',
                color: c.text,
                fontSize: '14px',
                fontFamily: 'monospace',
                cursor: 'pointer',
              }}
            >
              {pods.map((pod) => (
                <option key={pod.name} value={pod.name}>
                  {pod.name}
                </option>
              ))}
            </select>
          </div>

          {containers.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', color: c.textSecondary, fontWeight: 500 }}>
                Container:
              </label>
              <select
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${c.border}`,
                  backgroundColor: theme === 'light' ? '#fff' : '#1f2937',
                  color: c.text,
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                {containers.map((container) => (
                  <option key={container.name} value={container.name}>
                    {container.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '14px',
            marginBottom: '12px',
          }}
        >
          Failed to load logs: {error.message}
        </div>
      )}

      <div
        style={{
          backgroundColor: theme === 'light' ? '#1e1e1e' : '#0d1117',
          borderRadius: '6px',
          padding: '16px',
          maxHeight: '500px',
          overflowY: 'auto',
          border: `1px solid ${c.border}`,
        }}
      >
        {isLoading && !logs && (
          <div style={{ color: '#9ca3af', fontSize: '14px' }}>Loading logs...</div>
        )}

        {!isLoading && !error && !logs && (
          <div style={{ color: '#9ca3af', fontSize: '14px' }}>No logs available</div>
        )}

        {logs && (
          <pre
            style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#e5e7eb',
              fontFamily: 'Monaco, Menlo, "Courier New", monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {logs}
          </pre>
        )}
      </div>

      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: c.textSecondary,
          textAlign: 'right',
        }}
      >
        Showing last 100 lines
      </div>
    </div>
  );
}
