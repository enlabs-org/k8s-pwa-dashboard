import { useState, useCallback, useEffect } from 'react';
import { usePolling } from './usePolling';
import { fetchDeployments, scaleDeployment as apiScaleDeployment } from '../api/deployments';
import { Deployment, DeploymentSummary } from '../types';

export function useDeployments(pollingInterval: number) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [summary, setSummary] = useState<DeploymentSummary>({
    total: 0,
    running: 0,
    error: 0,
    pending: 0,
    scaledToZero: 0,
  });
  const [scalingDeployments, setScalingDeployments] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch } = usePolling(fetchDeployments, {
    interval: pollingInterval,
    enabled: true,
  });

  useEffect(() => {
    if (data) {
      setDeployments(data.deployments);
      setSummary(data.summary);
    }
  }, [data]);

  const scaleDeployment = useCallback(
    async (namespace: string, name: string, replicas: number) => {
      const key = `${namespace}/${name}`;

      // Mark as scaling
      setScalingDeployments((prev) => new Set(prev).add(key));

      // Optimistic update
      const previousDeployments = [...deployments];
      setDeployments((prev) =>
        prev.map((d) =>
          d.namespace === namespace && d.name === name
            ? {
                ...d,
                replicas: { ...d.replicas, desired: replicas },
                status: replicas === 0 ? 'scaled_to_zero' : 'pending',
              }
            : d
        )
      );

      try {
        await apiScaleDeployment(namespace, name, replicas);
        refetch();
      } catch (err) {
        // Rollback on error
        setDeployments(previousDeployments);
        throw err;
      } finally {
        setScalingDeployments((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [deployments, refetch]
  );

  const isScaling = useCallback(
    (namespace: string, name: string) => scalingDeployments.has(`${namespace}/${name}`),
    [scalingDeployments]
  );

  return {
    deployments,
    summary,
    isLoading,
    error,
    scaleDeployment,
    isScaling,
    refetch,
  };
}
