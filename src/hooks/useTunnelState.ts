'use client';

import { useState, useEffect, useCallback } from 'react';

export function useTunnelState() {
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [isTunneling, setIsTunneling] = useState(false);
  const [tunnelLoading, setTunnelLoading] = useState(false);
  const [isDocker, setIsDocker] = useState(false);

  const toggleTunnel = useCallback(async () => {
    if (isDocker) return; // Block tunnel toggle in docker mode
    setTunnelLoading(true);
    try {
      if (isTunneling) {
        await fetch('/api/tunnel', { method: 'POST', body: JSON.stringify({ action: 'stop' }) });
        setIsTunneling(false);
        setTunnelUrl(null);
      } else {
        const res = await fetch('/api/tunnel', { method: 'POST', body: JSON.stringify({ action: 'start' }) });
        const data = await res.json();
        if (data.url) {
          setTunnelUrl(data.url);
          setIsTunneling(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setTunnelLoading(false);
  }, [isTunneling, isDocker]);

  useEffect(() => {
    fetch('/api/tunnel', { method: 'POST', body: JSON.stringify({ action: 'status' }) })
      .then(r => r.json())
      .then(d => {
        setIsDocker(!!d.isDocker);
        if (d.url) {
          setTunnelUrl(d.url);
          setIsTunneling(true);
        }
      })
      .catch(() => {});
  }, []);

  return {
    tunnelUrl,
    isTunneling,
    tunnelLoading,
    toggleTunnel,
    isDocker
  };
}
