import { useState, useEffect } from 'react';
import { fetchPodFiles, downloadPodFile } from '../api/deployments';
import { PodInfo, FileInfo } from '../types';
import { useTheme, colors } from '../context/ThemeContext';

interface FileBrowserProps {
  namespace: string;
  deploymentName: string;
  pods: PodInfo[];
}

export function FileBrowser({ namespace, deploymentName, pods }: FileBrowserProps) {
  const { theme } = useTheme();
  const c = colors[theme];

  const [selectedPod, setSelectedPod] = useState<string>('');
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [currentPath, setCurrentPath] = useState('.');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

  // Load files when pod, container, or path changes
  useEffect(() => {
    if (!selectedPod || !selectedContainer) return;

    setIsLoading(true);
    setError(null);

    fetchPodFiles(namespace, deploymentName, selectedPod, selectedContainer, currentPath)
      .then((response) => setFiles(response.files))
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [namespace, deploymentName, selectedPod, selectedContainer, currentPath]);

  const handleNavigate = (fileName: string, type: 'file' | 'directory') => {
    if (type === 'directory') {
      if (currentPath === '.') {
        setCurrentPath(fileName);
      } else if (currentPath === '/') {
        setCurrentPath(`/${fileName}`);
      } else {
        setCurrentPath(`${currentPath}/${fileName}`);
      }
    }
  };

  const handleGoUp = () => {
    if (currentPath === '.' || currentPath === '/') return;

    // If path doesn't contain '/', we're one level down from '.'
    if (!currentPath.includes('/')) {
      setCurrentPath('.');
      return;
    }

    const parts = currentPath.split('/');
    parts.pop();
    const newPath = parts.join('/');
    setCurrentPath(newPath || '.');
  };

  const handleDownload = (fileName: string) => {
    const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
    downloadPodFile(namespace, deploymentName, selectedPod, selectedContainer, filePath);
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
          File Browser
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
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: c.text }}>
          File Browser
        </h2>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', color: c.textSecondary, fontWeight: 500 }}>
              Pod:
            </label>
            <select
              value={selectedPod}
              onChange={(e) => {
                setSelectedPod(e.target.value);
                setCurrentPath('/');
              }}
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
                onChange={(e) => {
                  setSelectedContainer(e.target.value);
                  setCurrentPath('/');
                }}
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
        </div>
      </div>

      {/* Breadcrumb path */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: theme === 'light' ? '#f3f4f6' : '#1f2937',
          borderRadius: '6px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '14px', color: c.textSecondary, fontFamily: 'monospace' }}>
          📁 {currentPath}
        </span>
        {currentPath !== '/' && (
          <button
            onClick={handleGoUp}
            style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              backgroundColor: theme === 'light' ? '#e5e7eb' : '#374151',
              color: c.text,
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ↑ Up
          </button>
        )}
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
          Failed to load files: {error.message}
        </div>
      )}

      {/* File list */}
      <div
        style={{
          backgroundColor: theme === 'light' ? '#fff' : '#111827',
          borderRadius: '6px',
          border: `1px solid ${c.border}`,
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {isLoading && (
          <div style={{ padding: '24px', textAlign: 'center', color: c.textSecondary }}>
            Loading files...
          </div>
        )}

        {!isLoading && !error && files.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: c.textSecondary }}>
            Empty directory
          </div>
        )}

        {!isLoading && files.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.border}` }}>
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
                  TYPE
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
                  PERMISSIONS
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: c.textSecondary,
                  }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: `1px solid ${c.border}`,
                    cursor: file.type === 'directory' ? 'pointer' : 'default',
                  }}
                  onClick={() =>
                    file.type === 'directory' ? handleNavigate(file.name, file.type) : null
                  }
                >
                  <td
                    style={{
                      padding: '12px',
                      fontSize: '14px',
                      color: c.text,
                      fontFamily: 'monospace',
                    }}
                  >
                    {file.type === 'directory' ? '📁' : '📄'} {file.name}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      fontSize: '14px',
                      color: c.textSecondary,
                    }}
                  >
                    {file.type}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      fontSize: '13px',
                      color: c.textSecondary,
                      fontFamily: 'monospace',
                    }}
                  >
                    {file.permissions}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {file.type === 'file' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file.name);
                        }}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: c.textSecondary,
        }}
      >
        Click on directories to navigate • Click Download to save files
      </div>
    </div>
  );
}
