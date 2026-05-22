'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { MediaFile } from '../types';

interface AudioContextType {
  currentFile: MediaFile | null;
  setCurrentFile: (f: MediaFile | null) => void;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  duration: number;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  volume: number;
  queue: MediaFile[];
  queueIndex: number;
  setQueueIndex: React.Dispatch<React.SetStateAction<number>>;
  repeatMode: 'none' | 'all' | 'one';
  isShuffle: boolean;
  setIsShuffle: React.Dispatch<React.SetStateAction<boolean>>;
  setVolume: (v: number) => void;
  setQueue: React.Dispatch<React.SetStateAction<MediaFile[]>>;
  setRepeatMode: React.Dispatch<React.SetStateAction<'none' | 'all' | 'one'>>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playFile: (file: MediaFile) => void;
  playPlaylistRewrite: (files: MediaFile[]) => void;
  playPlaylistAppend: (files: MediaFile[]) => void;
  handlePrev: () => void;
  handleNext: (autoEnded?: boolean) => void;
  togglePlay: () => void;
  seekBy: (delta: number) => void;
  seekTo: (time: number) => void;
  getMediaEl: () => HTMLAudioElement | null;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudioPlayer = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioProvider');
  return ctx;
};

// Global singleton instance
let globalAudio: HTMLAudioElement | null = null;
const getAudio = () => {
  if (typeof window !== 'undefined' && !globalAudio) {
    globalAudio = new Audio();
  }
  return globalAudio;
};

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentFile, setCurrentFile] = useState<MediaFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [queue, setQueue] = useState<MediaFile[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [isShuffle, setIsShuffle] = useState(false);

  // Use refs to avoid closure stale state in event listeners without re-binding
  const stateRef = useRef({ queue, queueIndex, repeatMode, isShuffle });
  useEffect(() => {
    stateRef.current = { queue, queueIndex, repeatMode, isShuffle };
  }, [queue, queueIndex, repeatMode, isShuffle]);

  const handleNext = useCallback((autoEnded?: boolean) => {
    const { queue, queueIndex, repeatMode, isShuffle } = stateRef.current;
    if (!queue.length) return;

    const audio = getAudio();
    if (autoEnded && repeatMode === 'one') {
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
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
    const nextFile = queue[next];
    setCurrentFile(nextFile);
    setIsPlaying(true);
    
    if (audio) {
      if (audio.src && !audio.src.endsWith(nextFile.path)) {
        audio.src = nextFile.path;
      }
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const audio = getAudio();
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); handleNext(true); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, [handleNext]);

  useEffect(() => {
    const audio = getAudio();
    if (audio) audio.volume = volume;
  }, [volume]);

  const playFile = useCallback((file: MediaFile) => {
    setCurrentFile(file);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    setQueue(prev => prev.some(q => q.path === file.path) ? prev : [file, ...prev]);
    setQueueIndex(0);

    const audio = getAudio();
    if (audio) {
      if (audio.src && !audio.src.endsWith(file.path)) {
        audio.src = file.path;
      } else if (!audio.src) {
        audio.src = file.path;
      }
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
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
    const { queue, queueIndex, repeatMode, isShuffle } = stateRef.current;
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
    const prevFile = queue[prev];
    setCurrentFile(prevFile);
    setIsPlaying(true);
    
    const audio = getAudio();
    if (audio) {
      if (audio.src && !audio.src.endsWith(prevFile.path)) {
        audio.src = prevFile.path;
      }
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = getAudio();
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seekBy = useCallback((delta: number) => {
    const audio = getAudio();
    if (!audio) return;
    const dur = audio.duration;
    if (!isFinite(dur) || dur === 0) return;
    audio.currentTime = Math.max(0, Math.min(dur, audio.currentTime + delta));
  }, []);

  const seekTo = useCallback((time: number) => {
    const audio = getAudio();
    if (!audio) return;
    const dur = audio.duration;
    if (!isFinite(dur) || dur === 0) return;
    audio.currentTime = Math.max(0, Math.min(dur, time));
  }, []);

  const toggleShuffle = useCallback(() => setIsShuffle(prev => !prev), []);
  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  }, []);

  // Global hotkeys for media control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        if (e.shiftKey) {
          e.preventDefault();
          handlePrev();
        } else {
          e.preventDefault();
          seekBy(-10);
        }
      } else if (e.code === 'ArrowRight') {
        if (e.shiftKey) {
          e.preventDefault();
          handleNext();
        } else {
          e.preventDefault();
          seekBy(10);
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume(v => Math.min(1, v + 0.1));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume(v => Math.max(0, v - 0.1));
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setVolume(v => v > 0 ? 0 : 0.8);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay, seekBy, handlePrev, handleNext, setVolume]);

  return (
    <AudioContext.Provider value={{
      currentFile, setCurrentFile, isPlaying, setIsPlaying, currentTime, setCurrentTime,
      duration, setDuration, volume, setVolume, queue, setQueue, queueIndex, setQueueIndex,
      repeatMode, setRepeatMode, isShuffle, setIsShuffle,
      toggleShuffle, toggleRepeat, playFile, playPlaylistRewrite,
      playPlaylistAppend, handlePrev, handleNext, togglePlay, seekBy, seekTo, getMediaEl: getAudio
    }}>
      {children}
    </AudioContext.Provider>
  );
}
