import { useState, useEffect, useCallback } from 'react';

interface ExternalChangeState {
  hasExternalChange: boolean;
  changedAt: string | null;
  filePath: string | null;
}

/**
 * Hook for detecting external file changes (e.g., cloud sync)
 * Listens to Electron's data:changed events
 */
export function useExternalFileChange() {
  const [state, setState] = useState<ExternalChangeState>({
    hasExternalChange: false,
    changedAt: null,
    filePath: null,
  });

  // Track last known modification time to avoid false positives from our own writes
  const [lastKnownMtime, setLastKnownMtime] = useState<number | null>(null);

  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI?.onDataChanged) return;

    electronAPI.onDataChanged((payload: { path: string; mtimeMs: number }) => {
      // Skip if this is from our own write (within 2 seconds of last known mtime)
      if (lastKnownMtime && Math.abs(payload.mtimeMs - lastKnownMtime) < 2000) {
        return;
      }

      setState({
        hasExternalChange: true,
        changedAt: new Date(payload.mtimeMs).toISOString(),
        filePath: payload.path,
      });
    });

    return () => {
      // Cleanup handled by ipcRenderer.removeAllListeners in preload
    };
  }, [lastKnownMtime]);

  const dismiss = useCallback(() => {
    setState({
      hasExternalChange: false,
      changedAt: null,
      filePath: null,
    });
  }, []);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  const updateLastKnownMtime = useCallback((mtimeMs: number) => {
    setLastKnownMtime(mtimeMs);
  }, []);

  return {
    ...state,
    dismiss,
    reload,
    updateLastKnownMtime,
  };
}
