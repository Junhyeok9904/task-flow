'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaFile, Playlist } from '../types';
import { useAudioPlayer } from '../contexts/AudioProvider';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isAlert?: boolean;
  onConfirm: () => void;
}

export function useMediaFiles(
  playlists: Playlist[],
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>,
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState | null>>,
  showAlert: (title: string, msg: string, isDanger?: boolean) => void
) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'added'>('added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load initial sorting state from localStorage on mount
  useEffect(() => {
    try {
      const savedSortBy = localStorage.getItem('tf_sort_by') as 'name' | 'size' | 'added' | null;
      const savedSortOrder = localStorage.getItem('tf_sort_order') as 'asc' | 'desc' | null;
      if (savedSortBy) setSortBy(savedSortBy);
      if (savedSortOrder) setSortOrder(savedSortOrder);
    } catch (e) {
      console.error("Failed to load sorting preferences:", e);
    }
  }, []);

  // Save sorting state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('tf_sort_by', sortBy);
      localStorage.setItem('tf_sort_order', sortOrder);
    } catch (e) {
      console.error("Failed to save sorting preferences:", e);
    }
  }, [sortBy, sortOrder]);

  const handleSortChange = useCallback((field: 'name' | 'size' | 'added') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      if (field === 'name') {
        setSortOrder('asc');
      } else {
        setSortOrder('desc');
      }
    }
  }, [sortBy]);

  const [activeFilterTag, setActiveFilterTag] = useState<'all' | 'audio' | 'video'>('all');
  const [currentFolder, setCurrentFolder] = useState('');
  const [selectedTracksList, setSelectedTracksList] = useState<string[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MediaFile | null>(null);

  const { currentFile, setCurrentFile, isPlaying, setIsPlaying, setQueue, getMediaEl } = useAudioPlayer();

  const loadData = useCallback(async () => {
    try {
      const qp = new URLSearchParams();
      if (search) qp.set('q', search);
      if (activeFilterTag !== 'all') qp.set('type', activeFilterTag);

      const [mRes, pRes] = await Promise.all([
        fetch(`/api/music/search?${qp.toString()}`),
        fetch('/api/playlists')
      ]);
      if (!mRes.ok || !pRes.ok) throw new Error('데이터 로드 실패');
      setMediaFiles(await mRes.json());
      setPlaylists(await pRes.json());
      setError(null);
    } catch (e: any) {
      setError(e.message || '서버 통신 오류');
    }
  }, [search, activeFilterTag, setPlaylists]);

  // Sync back on mount
  useEffect(() => {
    setLoading(true);
    const isDev = process.env.NODE_ENV === 'development';
    document.title = isDev ? '[DEV] Task-Flow' : 'Task-Flow';

    loadData().finally(() => setLoading(false));

    fetch('/api/media/sync', { method: 'POST' })
      .then(r => r.json())
      .then(d => d.synced > 0 && loadData())
      .catch(() => {});
  }, [loadData]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => { loadData(); }, 300);
    return () => clearTimeout(handler);
  }, [search, activeFilterTag, loadData]);

  // Auto select first track
  useEffect(() => {
    if (mediaFiles.length > 0 && !selectedTrack) {
      setSelectedTrack(mediaFiles[0]);
    }
  }, [mediaFiles, selectedTrack]);

  const deleteFile = useCallback((filename: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '파일 삭제',
      message: `'${filename}' 파일을 라이브러리에서 정말 삭제하시겠습니까?`,
      confirmText: '삭제',
      cancelText: '취소',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/media?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
          if (res.ok) {
            if (currentFile && currentFile.name === filename) {
              const el = getMediaEl();
              if (el) el.pause();
              setCurrentFile(null);
              setIsPlaying(false);
            }
            if (selectedTrack && selectedTrack.name === filename) setSelectedTrack(null);
            setQueue(prev => prev.filter(q => q.name !== filename));
            await loadData();
          } else {
            showAlert('에러', '파일 삭제에 실패했습니다.', true);
          }
        } catch (e) { console.error(e); }
      }
    });
  }, [currentFile, selectedTrack, getMediaEl, setCurrentFile, setIsPlaying, setQueue, loadData, setConfirmDialog, showAlert]);

  const deleteSelectedTracks = useCallback(() => {
    if (!selectedTracksList.length) return;
    const targets = selectedTracksList.map(p => mediaFiles.find(m => m.path === p)?.name).filter(Boolean) as string[];
    if (!targets.length) return;

    setConfirmDialog({
      isOpen: true,
      title: '선택 파일 삭제',
      message: `선택한 ${targets.length}개의 파일을 정말 삭제하시겠습니까?`,
      confirmText: '삭제',
      cancelText: '취소',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/media', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames: targets })
          });
          if (res.ok) {
            if (currentFile && targets.includes(currentFile.name)) {
              const el = getMediaEl();
              if (el) el.pause();
              setCurrentFile(null);
              setIsPlaying(false);
            }
            if (selectedTrack && targets.includes(selectedTrack.name)) setSelectedTrack(null);
            setQueue(prev => prev.filter(q => !targets.includes(q.name)));
            setSelectedTracksList([]);
            await loadData();
            showAlert('성공', '선택한 파일이 성공적으로 삭제되었습니다.');
          } else {
            showAlert('에러', '선택한 파일 삭제에 실패했습니다.', true);
          }
        } catch (e) { console.error(e); }
      }
    });
  }, [selectedTracksList, mediaFiles, currentFile, selectedTrack, getMediaEl, setCurrentFile, setIsPlaying, setQueue, loadData, setConfirmDialog, showAlert]);

  const toggleSelectTrack = useCallback((path: string) => {
    setSelectedTracksList(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
  }, []);

  return {
    mediaFiles, loading, error, search, setSearch, sortBy, setSortBy,
    sortOrder, setSortOrder, handleSortChange,
    activeFilterTag, setActiveFilterTag, currentFolder, setCurrentFolder,
    selectedTracksList, setSelectedTracksList, selectedTrack, setSelectedTrack,
    loadData, deleteFile, deleteSelectedTracks, toggleSelectTrack
  };
}
