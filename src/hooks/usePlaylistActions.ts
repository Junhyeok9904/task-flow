'use client';

import { useState, useCallback } from 'react';
import { MediaFile, Playlist } from '../types';

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

interface DuplicateModalState {
  isOpen: boolean;
  playlistId: string;
  playlistName: string;
  trackPath: string;
  trackName: string;
}

export function usePlaylistActions(
  playlists: Playlist[],
  mediaFiles: MediaFile[],
  selectedTracksList: string[],
  setSelectedTracksList: React.Dispatch<React.SetStateAction<string[]>>,
  loadData: () => Promise<void>,
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState | null>>,
  showAlert: (title: string, msg: string, isDanger?: boolean) => void
) {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [duplicateModal, setDuplicateModal] = useState<DuplicateModalState | null>(null);

  const createPlaylist = useCallback(async () => {
    if (!newPlaylistName.trim()) return;
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name: newPlaylistName.trim() })
    });
    setNewPlaylistName('');
    await loadData();
  }, [newPlaylistName, loadData]);

  const deletePlaylist = useCallback((id: string) => {
    const playlistName = playlists.find(p => p.id === id)?.name || '';
    setConfirmDialog({
      isOpen: true,
      title: '플레이리스트 삭제',
      message: `'${playlistName}' 플레이리스트를 삭제하시겠습니까?`,
      confirmText: '삭제',
      cancelText: '취소',
      isDanger: true,
      onConfirm: async () => {
        await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id })
        });
        if (selectedPlaylistId === id) setSelectedPlaylistId(null);
        await loadData();
      }
    });
  }, [playlists, selectedPlaylistId, loadData, setConfirmDialog]);

  const handleAddTrack = useCallback(async (playlistId: string, playlistName: string, track: MediaFile) => {
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addItem', id: playlistId, itemPath: track.path })
      });
      const data = await res.json();
      if (data.duplicate) {
        setDuplicateModal({
          isOpen: true,
          playlistId,
          playlistName,
          trackPath: track.path,
          trackName: track.name
        });
      } else {
        await loadData();
        showAlert('성공', '플레이리스트가 성공적으로 업데이트되었습니다.');
      }
    } catch (e) { console.error(e); }
  }, [loadData, showAlert]);

  const handleAddBatchTracks = useCallback(async (playlistId: string, playlistName: string) => {
    if (!selectedTracksList.length) return;
    let duplicateOccurred = false;
    for (const trackPath of selectedTracksList) {
      const track = mediaFiles.find(m => m.path === trackPath);
      if (!track) continue;
      try {
        const res = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'addItem', id: playlistId, itemPath: trackPath })
        });
        const data = await res.json();
        if (data.duplicate) {
          duplicateOccurred = true;
          setDuplicateModal({
            isOpen: true,
            playlistId,
            playlistName,
            trackPath,
            trackName: track.name
          });
        }
      } catch (e) { console.error(e); }
    }
    setSelectedTracksList([]);
    await loadData();
    if (!duplicateOccurred) showAlert('성공', '선택한 곡들이 플레이리스트에 추가되었습니다.');
  }, [selectedTracksList, mediaFiles, loadData, setSelectedTracksList, showAlert]);

  const handleResolveDuplicate = useCallback(async (strategy: 'skip' | 'replace' | 'keep_both') => {
    if (!duplicateModal) return;
    try {
      await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addItem',
          id: duplicateModal.playlistId,
          itemPath: duplicateModal.trackPath,
          strategy
        })
      });
      setDuplicateModal(null);
      await loadData();
    } catch (e) { console.error(e); }
  }, [duplicateModal, loadData]);

  const togglePlaylistItem = useCallback(async (pid: string, itemPath: string, isIn: boolean) => {
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isIn ? 'removeItem' : 'addItem',
        id: pid,
        itemPath,
        force: true
      })
    });
    await loadData();
  }, [loadData]);

  return {
    newPlaylistName, setNewPlaylistName,
    selectedPlaylistId, setSelectedPlaylistId,
    duplicateModal, setDuplicateModal,
    createPlaylist, deletePlaylist,
    handleAddTrack, handleAddBatchTracks,
    handleResolveDuplicate, togglePlaylistItem
  };
}
