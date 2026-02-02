interface ScaleControlsProps {
  currentReplicas: number;
  onScale: (replicas: number) => void;
  isScaling: boolean;
  disabled: boolean;
}

export function ScaleControls({ currentReplicas, onScale, isScaling, disabled }: ScaleControlsProps) {
  const buttonStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: disabled || isScaling ? 'not-allowed' : 'pointer',
    opacity: disabled || isScaling ? 0.5 : 1,
    backgroundColor: active ? '#3b82f6' : '#e5e7eb',
    color: active ? '#fff' : '#374151',
    transition: 'all 0.2s',
  });

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        style={buttonStyle(currentReplicas === 0)}
        onClick={() => onScale(0)}
        disabled={disabled || isScaling || currentReplicas === 0}
        title="Stop (scale to 0)"
      >
        {isScaling ? 'Scaling...' : 'Stop'}
      </button>
      <button
        style={buttonStyle(currentReplicas === 1)}
        onClick={() => onScale(1)}
        disabled={disabled || isScaling || currentReplicas === 1}
        title="Start (scale to 1)"
      >
        {isScaling ? 'Scaling...' : 'Start'}
      </button>
    </div>
  );
}
