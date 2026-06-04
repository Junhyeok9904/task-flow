'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { MediaFile } from '../types';
import { insertAfterCurrent, removeTrackFromQueue, insertAtQueueEnd } from '../lib/queueHelper';

export interface CompressorSettings {
  threshold: number;
  ratio: number;
  attack: number; // in seconds
  release: number; // in seconds
  knee: number;
}

export type CompressorMode = 'off' | 'soft' | 'medium' | 'strong' | 'custom';

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
  unlockAudioDevice: () => void;
  addToQueueNext: (file: MediaFile) => void;
  addToQueueEnd: (file: MediaFile) => void;
  playFromQueue: (index: number) => void;
  removeFromQueue: (index: number) => void;
  toast: { message: string; type: 'success' | 'error' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  
  // Compressor settings
  compressorMode: CompressorMode;
  setCompressorMode: (mode: CompressorMode) => void;
  compressorSettings: CompressorSettings;
  setCompressorSettings: (settings: CompressorSettings) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudioPlayer = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioProvider');
  return ctx;
};

// Global singleton Web Audio nodes
let globalAudio: HTMLAudioElement | null = null;
let globalAudioCtx: AudioContext | null = null;
let globalSourceNode: MediaElementAudioSourceNode | null = null;
let globalCompressorNode: DynamicsCompressorNode | null = null;

const getAudio = () => {
  if (typeof window !== 'undefined' && !globalAudio) {
    globalAudio = new Audio();
  }
  return globalAudio;
};

const initWebAudio = (audio: HTMLAudioElement) => {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      globalAudioCtx = new AudioContextClass();
      globalSourceNode = globalAudioCtx.createMediaElementSource(audio);
      globalCompressorNode = globalAudioCtx.createDynamicsCompressor();
      
      // Connection: Source -> Compressor -> Destination
      globalSourceNode.connect(globalCompressorNode);
      globalCompressorNode.connect(globalAudioCtx.destination);
    } catch (e) {
      console.error("Failed to initialize Web Audio API:", e);
    }
  }
  return {
    ctx: globalAudioCtx,
    compressor: globalCompressorNode
  };
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

  // Compressor States
  const [compressorMode, setCompressorModeState] = useState<CompressorMode>('off');
  const [compressorSettings, setCompressorSettingsState] = useState<CompressorSettings>({
    threshold: -24,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
    knee: 30
  });

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2500);
  }, []);

  const applyCompressor = useCallback((mode: CompressorMode, settings: CompressorSettings) => {
    const audio = getAudio();
    if (!audio) return;
    const webAudio = initWebAudio(audio);
    if (!webAudio || !webAudio.compressor || !webAudio.ctx) return;

    const comp = webAudio.compressor;
    const ctx = webAudio.ctx;
    const now = ctx.currentTime;

    let target = { threshold: 0, ratio: 1, attack: 0.003, release: 0.25, knee: 30 };

    if (mode === 'soft') {
      target = { threshold: -16, ratio: 3, attack: 0.01, release: 0.15, knee: 20 };
    } else if (mode === 'medium') {
      target = { threshold: -24, ratio: 8, attack: 0.005, release: 0.20, knee: 30 };
    } else if (mode === 'strong') {
      target = { threshold: -36, ratio: 16, attack: 0.002, release: 0.25, knee: 40 };
    } else if (mode === 'custom') {
      target = settings;
    }

    try {
      comp.threshold.setValueAtTime(target.threshold, now);
      comp.ratio.setValueAtTime(target.ratio, now);
      comp.attack.setValueAtTime(target.attack, now);
      comp.release.setValueAtTime(target.release, now);
      comp.knee.setValueAtTime(target.knee, now);
    } catch (e) {
      console.error("Failed to apply compressor settings:", e);
    }
  }, []);

  const setCompressorMode = useCallback((mode: CompressorMode) => {
    setCompressorModeState(mode);
    try {
      localStorage.setItem('tf_compressor_mode', mode);
    } catch (e) {}
    applyCompressor(mode, compressorSettings);
  }, [compressorSettings, applyCompressor]);

  const setCompressorSettings = useCallback((settings: CompressorSettings) => {
    setCompressorSettingsState(settings);
    try {
      localStorage.setItem('tf_compressor_settings', JSON.stringify(settings));
    } catch (e) {}
    if (compressorMode === 'custom') {
      applyCompressor('custom', settings);
    }
  }, [compressorMode, applyCompressor]);

  // Load from localStorage and apply initial compressor on mount
  useEffect(() => {
    let loadedMode: CompressorMode = 'off';
    let loadedSettings = {
      threshold: -24,
      ratio: 12,
      attack: 0.003,
      release: 0.25,
      knee: 30
    };

    try {
      const savedMode = localStorage.getItem('tf_compressor_mode') as CompressorMode | null;
      const savedSettingsStr = localStorage.getItem('tf_compressor_settings');
      if (savedMode) {
        loadedMode = savedMode;
        setCompressorModeState(savedMode);
      }
      if (savedSettingsStr) {
        loadedSettings = JSON.parse(savedSettingsStr);
        setCompressorSettingsState(loadedSettings);
      }
    } catch (e) {}

    // Ensure audio element is created and bound
    const audio = getAudio();
    if (audio) {
      applyCompressor(loadedMode, loadedSettings);
    }
  }, [applyCompressor]);

  const playFile = useCallback((file: MediaFile) => {
    const audio = getAudio();
    if (!audio) return;

    setCurrentFile(file);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    
    // Add to front of queue if not present, and set index 0
    setQueue(prev => {
      const exists = prev.some(q => q.path === file.path);
      if (exists) {
        // If it exists, we find its index and play from there instead of moving to front?
        // Usually clicking from library means "play this now and start new session"
        // But let's keep it simple: if it exists, just find it and set index.
        const idx = prev.findIndex(q => q.path === file.path);
        setTimeout(() => setQueueIndex(idx), 0);
        return prev;
      }
      const newQueue = [file, ...prev];
      setTimeout(() => setQueueIndex(0), 0);
      return newQueue;
    });

    if (audio.src && !audio.src.endsWith(encodeURI(file.path).split('/').pop() || '')) {
      audio.src = file.path;
    } else if (!audio.src) {
      audio.src = file.path;
    }
    
    // Initialize Web Audio API nodes and resume context on user gesture
    const webAudio = initWebAudio(audio);
    if (webAudio && webAudio.ctx) {
      webAudio.ctx.resume();
    }
    
    audio.currentTime = 0;
    audio.play().catch(e => {
      console.error("Playback failed:", e);
      setIsPlaying(false);
    });
  }, []);

  const unlockAudioDevice = useCallback(() => {
    const audio = getAudio();
    if (audio) {
      // Play and immediately pause to unlock the audio context on mobile devices
      audio.play().then(() => {
        audio.pause();
      }).catch(e => {
        console.log("Audio unlock attempted:", e);
      });
    }
  }, []);

  const playFromQueue = useCallback((index: number) => {
    const { queue } = stateRef.current;
    const file = queue[index];
    if (!file) return;

    setCurrentFile(file);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    setQueueIndex(index);

    const audio = getAudio();
    if (audio) {
      // Initialize Web Audio API nodes and resume context on user gesture
      const webAudio = initWebAudio(audio);
      if (webAudio && webAudio.ctx) {
        webAudio.ctx.resume();
      }
      audio.src = file.path;
      audio.currentTime = 0;
      audio.play().catch(e => {
        console.error("Queue playback failed:", e);
        setIsPlaying(false);
      });
    }
  }, []);

  const addToQueueNext = useCallback((file: MediaFile) => {
    const { queue, isPlaying, currentFile } = stateRef.current;
    const audio = getAudio();
    
    // Determine if playback has naturally ended or if queue is empty
    const isQueueEmpty = !queue.length || !currentFile;
    const isFinished = !isPlaying && audio && (audio.ended || audio.currentTime === 0 || audio.currentTime >= audio.duration);

    if (isQueueEmpty || isFinished) {
      // If empty or finished, play immediately
      playFile(file);
      return;
    }

    setQueue(prev => {
      const { newQueue, newQueueIndex } = insertAfterCurrent(prev, currentFile, stateRef.current.queueIndex, file);
      
      // Update queue index state safely
      setTimeout(() => {
        setQueueIndex(newQueueIndex);
      }, 0);

      return newQueue;
    });
  }, [playFile]);

  const addToQueueEnd = useCallback((file: MediaFile) => {
    const { queue, isPlaying, currentFile } = stateRef.current;
    const audio = getAudio();
    
    // Determine if playback has naturally ended or if queue is empty
    const isQueueEmpty = !queue.length || !currentFile;
    const isFinished = !isPlaying && audio && (audio.ended || audio.currentTime === 0 || audio.currentTime >= audio.duration);

    if (isQueueEmpty || isFinished) {
      // If empty or finished, play immediately
      playFile(file);
      return;
    }

    setQueue(prev => {
      const { newQueue, newQueueIndex } = insertAtQueueEnd(prev, currentFile, stateRef.current.queueIndex, file);
      
      // Update queue index state safely
      setTimeout(() => {
        setQueueIndex(newQueueIndex);
      }, 0);

      return newQueue;
    });
  }, [playFile]);

  const removeFromQueue = useCallback((indexToRemove: number) => {
    const { queue, queueIndex, repeatMode } = stateRef.current;
    
    const { newQueue, newQueueIndex, shouldStop, shouldPlayNext } = removeTrackFromQueue(
      queue,
      queueIndex,
      indexToRemove,
      repeatMode
    );

    setQueue(newQueue);
    setQueueIndex(newQueueIndex);

    const audio = getAudio();

    if (shouldStop) {
      setCurrentFile(null);
      setIsPlaying(false);
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      showToast('대기열이 비어 재생을 중지합니다.', 'warning');
    } else if (shouldPlayNext) {
      const nextFile = newQueue[newQueueIndex];
      setCurrentFile(nextFile);
      setIsPlaying(true);
      if (audio && nextFile) {
        audio.src = nextFile.path;
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      showToast('현재 곡을 삭제하고 다음 곡을 재생합니다.', 'success');
    } else {
      showToast('대기열에서 제거되었습니다.', 'success');
    }
  }, [showToast]);

  // Use refs to avoid closure stale state in event listeners without re-binding
  const stateRef = useRef({ queue, queueIndex, repeatMode, isShuffle, isPlaying });
  useEffect(() => {
    stateRef.current = { queue, queueIndex, repeatMode, isShuffle, isPlaying };
  }, [queue, queueIndex, repeatMode, isShuffle, isPlaying]);

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
    const onError = (e: any) => {
      console.error("Audio element error:", audio.error);
      setIsPlaying(false);
      showToast("오디오를 재생할 수 없습니다. 파일이 없거나 지원하지 않는 형식입니다.", "error");
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [handleNext, showToast]);

  useEffect(() => {
    const audio = getAudio();
    if (audio) audio.volume = volume;
  }, [volume]);

  // playFile and addToQueueNext defined above

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
    showToast(`${playlistTracks.length}곡이 대기열에 추가되었습니다.`);
  }, [showToast]);

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
      // Initialize Web Audio API nodes and resume context on user gesture
      const webAudio = initWebAudio(audio);
      if (webAudio && webAudio.ctx) {
        webAudio.ctx.resume();
      }
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
      playPlaylistAppend, handlePrev, handleNext, togglePlay, seekBy, seekTo, getMediaEl: getAudio,
      addToQueueNext, addToQueueEnd, playFromQueue, removeFromQueue, toast, showToast, unlockAudioDevice,
      compressorMode, setCompressorMode, compressorSettings, setCompressorSettings
    }}>
      {children}
    </AudioContext.Provider>
  );
}
