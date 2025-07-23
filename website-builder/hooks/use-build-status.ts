import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export interface BuildStatus {
  websiteId: string;
  buildStatus: 'pending' | 'building' | 'running' | 'failed' | 'stopped';
  previewUrl?: string;
  portNumber?: number;
  lastBuildAt?: string;
  buildDuration?: number;
  buildOutput?: string[];
  processInfo?: {
    status: string;
    startTime?: string;
    endTime?: string;
    buildOutput: string[];
  };
}

interface UseBuildStatusOptions {
  websiteId: string;
  pollInterval?: number;
  onStatusChange?: (status: BuildStatus) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export function useBuildStatus({
  websiteId,
  pollInterval = 2000,
  onStatusChange,
  onError,
  enabled = true,
}: UseBuildStatusOptions) {
  const [status, setStatus] = useState<BuildStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const poll = async () => {
    try {
      const result = await api.websiteBuilder.getBuildStatus(websiteId);
      setStatus(result);
      onStatusChange?.(result);
      setError(null);
      if (result.buildStatus === 'building' || result.buildStatus === 'pending') {
        timeoutRef.current = setTimeout(poll, pollInterval);
      } else {
        setIsPolling(false);
      }
    } catch (err: any) {
      setError('Failed to check build status');
      onError?.(err?.message || 'Failed to check build status');
      setIsPolling(false);
    }
  };

  useEffect(() => {
    if (!websiteId || !enabled) return;
    setIsPolling(true);
    poll();
    return () => {
      setIsPolling(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId, enabled]);

  return { status, error, isPolling };
} 