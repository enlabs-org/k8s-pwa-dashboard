import { useEffect, useState } from 'react';
import { fetchConfig } from './api/deployments';
import { Dashboard } from './components/Dashboard';
import { AppConfig } from './types';

export function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: '#1e293b',
          color: '#fff',
          padding: '16px 24px',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>K8s Preview App Dashboard</h1>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 24px' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
            Loading configuration...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '24px',
              backgroundColor: '#fee2e2',
              borderRadius: '8px',
              color: '#991b1b',
              textAlign: 'center',
            }}
          >
            <h2 style={{ margin: '0 0 8px' }}>Failed to load configuration</h2>
            <p style={{ margin: 0 }}>{error.message}</p>
          </div>
        )}

        {config && <Dashboard config={config} />}
      </main>
    </div>
  );
}
