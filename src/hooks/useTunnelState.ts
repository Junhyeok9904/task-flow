'use client';

import { useState, useEffect, useCallback } from 'react';

export function useTunnelState() {
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [isTunneling, setIsTunneling] = useState(false);
  const [tunnelLoading, setTunnelLoading] = useState(false);

  const toggleTunnel = useCallback(async () => {
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
  }, [isTunneling]);

  useEffect(() => {
    fetch('/api/tunnel', { method: 'POST', body: JSON.stringify({ action: 'status' }) })
      .then(r => r.json())
      .then(d => {
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
    toggleTunnel
  };
}
