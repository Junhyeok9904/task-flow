import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaFile } from '../types';

export function useAudioPlayer() {
  const [currentFile, setCurrentFile] = useState<MediaFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [queue, setQueue] = useState<MediaFile[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [isShuffle, setIsShuffle] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const getMediaEl = useCallback(() => currentFile?.type === 'video' ? videoRef.current : audioRef.current, [currentFile]);

  const playFile = useCallback((file: MediaFile) => {
    setCurrentFile(file);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    setQueue(prev => prev.some(q => q.path === file.path) ? prev : [file, ...prev]);
    setQueueIndex(0);
  }, []);

  const playPlaylistRewrite = useCallback((playlistTracks: MediaFile[]) => {
    if (!playlistTracks.length) return;
    setQueue(playlistTracks);
    setQueueIndex(0);
    playFile(playlistTracks[0]);
  }, [playFile]);

  const playPlaylistAppend = useCallback((playlistTracks: MediaFile[]) => {
    if (!playlistTracks.length) return;
    setQueue(prev => {
      const uniqueNew = playlistTracks.filter(newT => !prev.some(oldT => oldT.path === newT.path));
      return [...prev, ...uniqueNew];
    });
    alert(`${playlistTracks.length}곡이 대기열에 추가되었습니다.`);
  }, []);

  const handlePrev = useCallback(() => {
    if (!queue.length) return;
    let prev = queueIndex;
    if (isShuffle) {
      prev = Math.floor(Math.random() * queue.length);
    } else {
      prev = queueIndex - 1;
      if (prev < 0) {
        prev = repeatMode === 'all' ? queue.length - 1 : 0;
      }
    }
    setQueueIndex(prev);
    setCurrentFile(queue[prev]);
    setIsPlaying(true);
    setTimeout(() => {
      const el = getMediaEl();
      if (el) { el.currentTime = 0; el.play().catch(() => {}); }
    }, 100);
  }, [queue, queueIndex, repeatMode, isShuffle, getMediaEl]);

  const handleNext = useCallback((autoEnded?: boolean) => {
    if (!queue.length) return;
    if (autoEnded && repeatMode === 'one') {
      const el = getMediaEl();
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }
    let next = queueIndex;
    if (isShuffle) {
      next = Math.floor(Math.random() * queue.length);
    } else {
      next = queueIndex + 1;
      if (next >= queue.length) {
        if (repeatMode === 'all') {
          next = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }
    setQueueIndex(next);
    setCurrentFile(queue[next]);
    setIsPlaying(true);
    setTimeout(() => {
      const el = getMediaEl();
      if (el) { el.currentTime = 0; el.play().catch(() => {}); }
    }, 100);
  }, [queue, queueIndex, repeatMode, isShuffle, getMediaEl]);

  // Synchronization hook
  useEffect(() => {
    const el = getMediaEl();
    if (!el) return;
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnded = () => { setIsPlaying(false); handleNext(true); };
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnded);
    };
  }, [currentFile, handleNext, getMediaEl]);

  useEffect(() => {
    const el = getMediaEl();
    if (el) el.volume = volume;
  }, [volume, currentFile, getMediaEl]);

  const togglePlay = useCallback(() => {
    const el = getMediaEl();
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentFile, getMediaEl]);

  const seekBy = useCallback((delta: number) => {
    const el = getMediaEl();
    if (!el) return;
    const dur = el.duration;
    if (!isFinite(dur) || dur === 0) return;
    el.currentTime = Math.max(0, Math.min(dur, el.currentTime + delta));
  }, [getMediaEl]);

  const toggleShuffle = useCallback(() => setIsShuffle(prev => !prev), []);
  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  }, []);

  return {
    currentFile, setCurrentFile,
    isPlaying, setIsPlaying,
    currentTime, setCurrentTime,
    duration, setDuration,
    volume, setVolume,
    queue, setQueue,
    queueIndex, setQueueIndex,
    repeatMode, setRepeatMode,
    isShuffle, setIsShuffle,
    audioRef, videoRef,
    getMediaEl,
    playPlaylistRewrite,
    playPlaylistAppend,
    handlePrev,
    handleNext,
    playFile,
    togglePlay,
    seekBy,
    toggleShuffle,
    toggleRepeat
  };
}
