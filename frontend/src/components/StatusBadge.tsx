import { DeploymentStatus } from '../types';
import { useTheme } from '../context/ThemeContext';

interface StatusBadgeProps {
  status: DeploymentStatus;
}

const statusConfig = {
  light: {
    running: { label: 'Running', color: '#166534', bg: '#dcfce7' },
    error: { label: 'Error', color: '#991b1b', bg: '#fee2e2' },
    pending: { label: 'Pending', color: '#854d0e', bg: '#fef9c3' },
    scaled_to_zero: { label: 'Stopped', color: '#374151', bg: '#e5e7eb' },
  },
  dark: {
    running: { label: 'Running', color: '#bbf7d0', bg: '#14532d' },
    error: { label: 'Error', color: '#fecaca', bg: '#7f1d1d' },
    pending: { label: 'Pending', color: '#fef08a', bg: '#713f12' },
    scaled_to_zero: { label: 'Stopped', color: '#9ca3af', bg: '#374151' },
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
        fontWeight: 500,
        color: config.color,
        backgroundColor: config.bg,
      }}
    >
      {config.label}
    </span>
  );
}
