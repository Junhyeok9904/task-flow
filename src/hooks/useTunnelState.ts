'use client';

import { useState, useEffect, useCallback } from 'react';

export function useTunnelState() {
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [isTunneling, setIsTunneling] = useState(false);
  const [tunnelLoading, setTunnelLoading] = useState(false);
  const [tunnelProgress, setTunnelProgress] = useState(0);
  const [visualProgress, setVisualProgress] = useState(0);
  const [tunnelProgressMsg, setTunnelProgressMsg] = useState('');
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [isDocker, setIsDocker] = useState(false);

  // 1. Smoothly interpolate visualProgress towards target tunnelProgress
  useEffect(() => {
    if (!tunnelLoading) {
      if (!isTunneling) {
        setVisualProgress(0);
      }
      return;
    }

    const stepTimer = setInterval(() => {
      setVisualProgress(prev => {
        if (prev < tunnelProgress) {
          const diff = tunnelProgress - prev;
          // Slowly creep up by 1~3% every 40ms to ensure smooth transition
          const step = Math.max(1, Math.min(3, Math.ceil(diff * 0.1)));
          return prev + step;
        }
        return prev;
      });
    }, 40);

    return () => clearInterval(stepTimer);
  }, [tunnelLoading, tunnelProgress, isTunneling]);

  // 2. Finalize tunnel activation only after visualProgress reaches 100%
  useEffect(() => {
    if (tunnelLoading && visualProgress === 100 && tunnelProgress === 100) {
      if (pendingUrl) {
        setTunnelUrl(pendingUrl);
        setIsTunneling(true);
      }
      setTunnelLoading(false);
    }
  }, [visualProgress, tunnelProgress, tunnelLoading, pendingUrl]);

  const startPolling = useCallback(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/tunnel', { method: 'POST', body: JSON.stringify({ action: 'status' }) });
        const data = await res.json();
        
        // Update target progress and message
        if (data.progress !== undefined) setTunnelProgress(data.progress);
        if (data.message !== undefined) setTunnelProgressMsg(data.message);

        if (data.status === 'running' && data.url) {
          // Store the URL in pending and let visualProgress catch up to 100
          setPendingUrl(data.url);
          setTunnelProgress(100);
          setTunnelProgressMsg('외부 접속 주소 생성 완료!');
          clearInterval(timer);
        } else if (data.status === 'error' || data.status === 'stopped') {
          setIsTunneling(false);
          setTunnelUrl(null);
          setTunnelLoading(false);
          setVisualProgress(0);
          clearInterval(timer);
        }
      } catch (e) {
        console.error('Tunnel polling error:', e);
        setTunnelLoading(false);
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, []);

  const toggleTunnel = useCallback(async () => {
    if (isDocker) return; // Block tunnel toggle in docker mode
    setTunnelLoading(true);
    setTunnelProgress(10);
    setVisualProgress(0);
    setTunnelProgressMsg('로컬 터널 기동 개시...');
    setPendingUrl(null);
    
    try {
      if (isTunneling) {
        await fetch('/api/tunnel', { method: 'POST', body: JSON.stringify({ action: 'stop' }) });
        setIsTunneling(false);
        setTunnelUrl(null);
        setTunnelLoading(false);
        setTunnelProgress(0);
        setVisualProgress(0);
        setTunnelProgressMsg('정지됨');
      } else {
        const res = await fetch('/api/tunnel', { method: 'POST', body: JSON.stringify({ action: 'start' }) });
        const data = await res.json();
        
        if (data.status === 'starting') {
          startPolling();
        } else if (data.status === 'running' && data.url) {
          setPendingUrl(data.url);
          setTunnelProgress(100);
          setTunnelProgressMsg('외부 접속 주소 생성 완료!');
        } else {
          setTunnelLoading(false);
          setTunnelProgress(0);
          setVisualProgress(0);
          setTunnelProgressMsg('기동 실패');
        }
      }
    } catch (e) {
      console.error(e);
      setTunnelLoading(false);
      setTunnelProgress(0);
      setVisualProgress(0);
      setTunnelProgressMsg('기동 에러 발생');
    }
  }, [isTunneling, isDocker, startPolling]);

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
    tunnelProgress: visualProgress, // Smooth progress mapped to existing property
    tunnelProgressMsg,
    toggleTunnel,
    isDocker
  };
}
