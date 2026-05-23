'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { MediaFile, Playlist } from '../types';
import { useUpload } from '../components/UploadManager';
import { useAudioPlayer } from '../contexts/AudioProvider';
import { useMediaFiles } from './useMediaFiles';
import { usePlaylistActions } from './usePlaylistActions';
import { useTunnelState } from './useTunnelState';

export function useHomeState() {
  const { enqueueFiles, tasks } = useUpload();
  const searchParams = useSearchParams();
  const queryView = searchParams.get('view');

  const [view, setView] = useState<'songs' | 'playlists' | 'upload' | 'recent'>('songs');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);
  const [activePlaylistsOpen, setActivePlaylistsOpen] = useState(true);
  const [activeQueueOpen, setActiveQueueOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [activeGenreTag, setActiveGenreTag] = useState<string>('Ambient Electronica');
  const [dragOver, setDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ track: MediaFile; x: number; y: number } | null>(null);

  const audioPlayer = useAudioPlayer();
  const { currentFile, playFile, addToQueueNext, showToast } = audioPlayer;

  useEffect(() => {
    if (queryView && ['songs', 'playlists', 'upload', 'recent'].includes(queryView)) {
      setView(queryView as any);
    } else if (!queryView) {
      setView('songs');
    }
  }, [queryView]);

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, []);

  const handleMenuClick = useCallback((e: React.MouseEvent, track: MediaFile) => {
    e.stopPropagation();
    e.preventDefault();
    setContextMenu({ track, x: e.clientX, y: e.clientY });
  }, []);

  const showAlert = useCallback((title: string, message: string, isDanger: boolean = false) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText: '확인',
      isDanger,
      isAlert: true,
      onConfirm: () => {}
    });
  }, []);

  // Sync state with useMediaFiles
  const mediaFilesState = useMediaFiles(playlists, setPlaylists, setConfirmDialog, showAlert);
  const { mediaFiles, loadData, currentFolder } = mediaFilesState;

  // Sync state with usePlaylistActions
  const playlistActionsState = usePlaylistActions(
    playlists,
    mediaFiles,
    mediaFilesState.selectedTracksList,
    mediaFilesState.setSelectedTracksList,
    loadData,
    setConfirmDialog,
    showAlert
  );

  // Sync state with Cloudflare tunnel
  const tunnelState = useTunnelState();

  // Helper calculating folder tree
  const getParentFolder = useCallback((filePath: string) => {
    const relative = filePath.replace(/^\/media\//, '');
    const parts = relative.split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
  }, []);

  const sortedSongs = [...mediaFiles].sort((a, b) => {
    if (mediaFilesState.sortBy === 'name') return a.name.localeCompare(b.name);
    if (mediaFilesState.sortBy === 'size') return (b.size || 0) - (a.size || 0);
    return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
  });

  const currentFolders = sortedSongs
    .map(s => getParentFolder(s.path))
    .filter(p => {
      if (!p) return false;
      return currentFolder === '' ? true : p.startsWith(currentFolder + '/');
    })
    .map(p => {
      if (currentFolder === '') return p.split('/')[0];
      const relative = p.slice(currentFolder.length + 1);
      return relative.split('/')[0];
    });

  const uniqueFolders = Array.from(new Set(currentFolders)).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const currentSongs = sortedSongs.filter(s => getParentFolder(s.path) === currentFolder);

  // Sync success count indexing
  const prevSuccessCount = useRef(0);
  const successCount = tasks.filter(t => t.status === 'SUCCESS').length;
  useEffect(() => {
    if (successCount > prevSuccessCount.current) {
      loadData();
    }
    prevSuccessCount.current = successCount;
  }, [successCount, loadData]);

  // Handle uploading and dropping
  const handleUpload = useCallback((files: FileList | null) => {
    if (files?.length) enqueueFiles(Array.from(files), currentFolder);
  }, [currentFolder, enqueueFiles]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  return {
    view, setView,
    playlists, setPlaylists,
    confirmDialog, setConfirmDialog,
    isPlaylistDropdownOpen, setIsPlaylistDropdownOpen,
    activePlaylistsOpen, setActivePlaylistsOpen,
    activeQueueOpen, setActiveQueueOpen,
    layoutMode, setLayoutMode,
    activeGenreTag, setActiveGenreTag,
    dragOver, setDragOver,
    contextMenu, setContextMenu,
    handleMenuClick, showAlert,
    ...audioPlayer,
    ...mediaFilesState,
    ...playlistActionsState,
    ...tunnelState,
    currentFolders: uniqueFolders,
    currentSongs,
    onDrop,
    handleUpload,
    currentFile,
    playFile,
    addToQueueNext,
    showToast
  };
}
