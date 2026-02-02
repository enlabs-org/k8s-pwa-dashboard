import { useTheme } from '../context/ThemeContext';

interface ScaleControlsProps {
  currentReplicas: number;
  onScale: (replicas: number) => void;
  isScaling: boolean;
  disabled: boolean;
}

export function ScaleControls({ currentReplicas, onScale, isScaling, disabled }: ScaleControlsProps) {
  const { theme } = useTheme();
  const isRunning = currentReplicas > 0;

  const handleToggle = () => {
    if (disabled || isScaling) return;
    onScale(isRunning ? 0 : 1);
  };

  return (
    <button
        onClick={handleToggle}
        disabled={disabled || isScaling}
        title={isRunning ? 'Stop (scale to 0)' : 'Start (scale to 1)'}
        style={{
          position: 'relative',
          width: '52px',
          height: '28px',
          backgroundColor: disabled || isScaling
            ? theme === 'light' ? '#e5e7eb' : '#374151'
            : isRunning
              ? '#22c55e'
              : theme === 'light' ? '#d1d5db' : '#4b5563',
          borderRadius: '14px',
          border: 'none',
          cursor: disabled || isScaling ? 'not-allowed' : 'pointer',
          padding: '0',
          transition: 'background-color 0.3s',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* Stop icon - left side */}
        <div
          style={{
            position: 'absolute',
            left: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill={isRunning ? '#166534' : theme === 'light' ? '#374151' : '#e5e7eb'}
            stroke="none"
          >
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        </div>

        {/* Play icon - right side */}
        <div
          style={{
            position: 'absolute',
            right: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill={isRunning ? '#fff' : theme === 'light' ? '#6b7280' : '#9ca3af'}
            stroke="none"
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>

        {/* Slider knob */}
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: isRunning ? '26px' : '2px',
            width: '24px',
            height: '24px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'left 0.3s ease-in-out',
            zIndex: 2,
          }}
        />
    </button>
  );
}
