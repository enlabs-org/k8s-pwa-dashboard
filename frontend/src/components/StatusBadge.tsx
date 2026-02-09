import { DeploymentStatus } from '../types';
import { useTheme } from '../context/ThemeContext';

interface StatusBadgeProps {
  status: DeploymentStatus;
}

const statusConfig = {
  light: {
    running: { label: 'Running', color: '#166534', bg: '#fff', border: '#22c55e' },
    error: { label: 'Error', color: '#991b1b', bg: '#fff', border: '#ef4444' },
    pending: { label: 'Pending', color: '#854d0e', bg: '#fff', border: '#eab308' },
    scaled_to_zero: { label: 'Stopped', color: '#374151', bg: '#fff', border: '#9ca3af' },
  },
  dark: {
    running: { label: 'Running', color: '#22c55e', bg: '#14532d', border: '#22c55e' },
    error: { label: 'Error', color: '#fca5a5', bg: '#7f1d1d', border: '#ef4444' },
    pending: { label: 'Pending', color: '#fde047', bg: '#713f12', border: '#eab308' },
    scaled_to_zero: { label: 'Stopped', color: '#d1d5db', bg: '#374151', border: '#6b7280' },
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { theme } = useTheme();
  const config = statusConfig[theme][status];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        color: config.color,
        backgroundColor: config.bg,
        border: `2px solid ${config.border}`,
      }}
    >
      {config.label}
    </span>
  );
}
