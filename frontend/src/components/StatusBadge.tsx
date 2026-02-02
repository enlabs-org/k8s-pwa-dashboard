import { DeploymentStatus } from '../types';

interface StatusBadgeProps {
  status: DeploymentStatus;
}

const statusConfig: Record<DeploymentStatus, { label: string; color: string; bg: string }> = {
  running: { label: 'Running', color: '#166534', bg: '#dcfce7' },
  error: { label: 'Error', color: '#991b1b', bg: '#fee2e2' },
  pending: { label: 'Pending', color: '#854d0e', bg: '#fef9c3' },
  scaled_to_zero: { label: 'Stopped', color: '#374151', bg: '#e5e7eb' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

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
