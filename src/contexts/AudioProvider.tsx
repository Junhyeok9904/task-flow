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
let globalAudioA: HTMLAudioElement | null = null;
let globalAudioB: HTMLAudioElement | null = null;
let globalAudioCtx: AudioContext | null = null;
let globalSourceNodeA: MediaElementAudioSourceNode | null = null;
let globalSourceNodeB: MediaElementAudioSourceNode | null = null;
let globalGainNodeA: GainNode | null = null;
let globalGainNodeB: GainNode | null = null;
let globalCompressorNode: DynamicsCompressorNode | null = null;

const getAudioA = () => {
  if (typeof window !== 'undefined' && !globalAudioA) {
    globalAudioA = new Audio();
  }
  return globalAudioA;
};

const getAudioB = () => {
  if (typeof window !== 'undefined' && !globalAudioB) {
    globalAudioB = new Audio();
  }
  return globalAudioB;
};

const initWebAudio = (audioA: HTMLAudioElement, audioB: HTMLAudioElement) => {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      globalAudioCtx = new AudioContextClass();
      
      globalSourceNodeA = globalAudioCtx.createMediaElementSource(audioA);
      globalSourceNodeB = globalAudioCtx.createMediaElementSource(audioB);
      
      globalGainNodeA = globalAudioCtx.createGain();
      globalGainNodeB = globalAudioCtx.createGain();
      
      globalCompressorNode = globalAudioCtx.createDynamicsCompressor();
      
      // Connection: Source -> Gain -> Compressor -> Destination
      globalSourceNodeA.connect(globalGainNodeA);
      globalSourceNodeB.connect(globalGainNodeB);
      
      globalGainNodeA.connect(globalCompressorNode);
      globalGainNodeB.connect(globalCompressorNode);
      
      globalCompressorNode.connect(globalAudioCtx.destination);
    } catch (e) {
      console.error("Failed to initialize Web Audio API:", e);
    }
  }
  return {
    ctx: globalAudioCtx,
    compressor: globalCompressorNode,
    gainA: globalGainNodeA,
    gainB: globalGainNodeB
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

  // Crossfade Refs & Helpers
  const activeChannelRef = useRef<'A' | 'B'>('A');
  const crossfadeTriggeredRef = useRef(false);

  const getActiveAudio = () => {
    return activeChannelRef.current === 'A' ? getAudioA() : getAudioB();
  };

  const getInactiveAudio = () => {
    return activeChannelRef.current === 'A' ? getAudioB() : getAudioA();
  };

  const stopAllAudio = () => {
    const a = getAudioA();
    const b = getAudioB();
    if (a) {
      a.pause();
      a.removeAttribute('src');
      a.load();
    }
    if (b) {
      b.pause();
      b.removeAttribute('src');
      b.load();
    }
    if (a && b) {
      const webAudio = initWebAudio(a, b);
      if (webAudio && webAudio.ctx && webAudio.gainA && webAudio.gainB) {
        const now = webAudio.ctx.currentTime;
        webAudio.gainA.gain.cancelScheduledValues(now);
        webAudio.gainB.gain.cancelScheduledValues(now);
        webAudio.gainA.gain.setValueAtTime(1.0, now);
        webAudio.gainB.gain.setValueAtTime(1.0, now);
      }
    }
    crossfadeTriggeredRef.current = false;
  };

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
    const audioA = getAudioA();
    const audioB = getAudioB();
    if (!audioA || !audioB) return;
    const webAudio = initWebAudio(audioA, audioB);
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

    // Ensure audio elements are created and bound
    const audioA = getAudioA();
    const audioB = getAudioB();
    if (audioA && audioB) {
      applyCompressor(loadedMode, loadedSettings);
    }
  }, [applyCompressor]);

  const playFile = useCallback((file: MediaFile) => {
    const audioA = getAudioA();
    const audioB = getAudioB();
    if (!audioA || !audioB) return;

    // Stop all ongoing crossfades and reset audio channels
    stopAllAudio();
    activeChannelRef.current = 'A';
    const activeAudio = getAudioA();

    setCurrentFile(file);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    
    // Add to front of queue if not present, and set index 0
    setQueue(prev => {
      const exists = prev.some(q => q.path === file.path);
      if (exists) {
        const idx = prev.findIndex(q => q.path === file.path);
        setTimeout(() => setQueueIndex(idx), 0);
        return prev;
      }
      const newQueue = [file, ...prev];
      setTimeout(() => setQueueIndex(0), 0);
      return newQueue;
    });

    activeAudio.src = file.path;
    
    // Initialize Web Audio API nodes and resume context on user gesture
    const webAudio = initWebAudio(audioA, audioB);
    if (webAudio && webAudio.ctx) {
      webAudio.ctx.resume();
    }
    
    activeAudio.currentTime = 0;
    activeAudio.play().catch(e => {
      console.error("Playback failed:", e);
      setIsPlaying(false);
    });
  }, []);

  const unlockAudioDevice = useCallback(() => {
    const audioA = getAudioA();
    const audioB = getAudioB();
    if (audioA) {
      audioA.play().then(() => {
        audioA.pause();
      }).catch(e => {
        console.log("Audio A unlock attempted:", e);
      });
    }
    if (audioB) {
      audioB.play().then(() => {
        audioB.pause();
      }).catch(e => {
        console.log("Audio B unlock attempted:", e);
      });
    }
  }, []);

  const playFromQueue = useCallback((index: number) => {
    const { queue } = stateRef.current;
    const file = queue[index];
    if (!file) return;

    stopAllAudio();
    activeChannelRef.current = 'A';
    const activeAudio = getAudioA();

    setCurrentFile(file);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    setQueueIndex(index);

    const audioA = getAudioA();
    const audioB = getAudioB();
    if (activeAudio && audioA && audioB) {
      // Initialize Web Audio API nodes and resume context on user gesture
      const webAudio = initWebAudio(audioA, audioB);
      if (webAudio && webAudio.ctx) {
        webAudio.ctx.resume();
      }
      activeAudio.src = file.path;
      activeAudio.currentTime = 0;
      activeAudio.play().catch(e => {
        console.error("Queue playback failed:", e);
        setIsPlaying(false);
      });
    }
  }, []);

  const addToQueueNext = useCallback((file: MediaFile) => {
    const { queue, currentFile } = stateRef.current;
    
    // Determine if queue is empty
    const isQueueEmpty = !queue.length || !currentFile;

    if (isQueueEmpty) {
      setQueue([file]);
      setCurrentFile(file);
      setQueueIndex(0);
      
      const activeAudio = getActiveAudio();
      if (activeAudio) {
        activeAudio.src = file.path;
      }
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
  }, []);

  const addToQueueEnd = useCallback((file: MediaFile) => {
    const { queue, currentFile } = stateRef.current;
    
    // Determine if queue is empty
    const isQueueEmpty = !queue.length || !currentFile;

    if (isQueueEmpty) {
      setQueue([file]);
      setCurrentFile(file);
      setQueueIndex(0);
      
      const activeAudio = getActiveAudio();
      if (activeAudio) {
        activeAudio.src = file.path;
      }
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
  }, []);

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

    if (shouldStop) {
      setCurrentFile(null);
      setIsPlaying(false);
      stopAllAudio();
      showToast('대기열이 비어 재생을 중지합니다.', 'warning');
    } else if (shouldPlayNext) {
      const nextFile = newQueue[newQueueIndex];
      setCurrentFile(nextFile);
      setIsPlaying(true);
      
      stopAllAudio();
      activeChannelRef.current = 'A';
      const activeAudio = getAudioA();
      
      if (activeAudio && nextFile) {
        activeAudio.src = nextFile.path;
        activeAudio.currentTime = 0;
        activeAudio.play().catch(() => {});
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

    if (autoEnded && repeatMode === 'one') {
      const activeAudio = getActiveAudio();
      if (activeAudio) {
        activeAudio.currentTime = 0;
        activeAudio.play().catch(() => {});
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

    stopAllAudio();
    activeChannelRef.current = 'A';
    const activeAudio = getAudioA();

    setQueueIndex(next);
    const nextFile = queue[next];
    setCurrentFile(nextFile);
    setIsPlaying(true);
    
    if (activeAudio && nextFile) {
      activeAudio.src = nextFile.path;
      activeAudio.currentTime = 0;
      activeAudio.play().catch(() => {});
    }
  }, []);

  const triggerCrossfade = useCallback((activeAudio: HTMLAudioElement) => {
    const { queue, queueIndex, repeatMode, isShuffle } = stateRef.current;
    if (!queue.length) return;

    let next = queueIndex;
    if (isShuffle) {
      next = Math.floor(Math.random() * queue.length);
    } else {
      next = queueIndex + 1;
      if (next >= queue.length) {
        if (repeatMode === 'all') {
          next = 0;
        } else {
          // No next track: Fade-out active track and stop
          crossfadeTriggeredRef.current = true;
          const audioA = getAudioA();
          const audioB = getAudioB();
          if (audioA && audioB) {
            const webAudio = initWebAudio(audioA, audioB);
            if (webAudio && webAudio.ctx) {
              const activeGain = activeChannelRef.current === 'A' ? webAudio.gainA : webAudio.gainB;
              if (activeGain) {
                const now = webAudio.ctx.currentTime;
                activeGain.gain.cancelScheduledValues(now);
                activeGain.gain.setValueAtTime(activeGain.gain.value, now);
                activeGain.gain.linearRampToValueAtTime(0.0, now + 5.0);
              }
            }
          }
          setTimeout(() => {
            setIsPlaying(false);
            stopAllAudio();
          }, 5000);
          return;
        }
      }
    }

    const nextFile = queue[next];
    if (!nextFile) return;

    crossfadeTriggeredRef.current = true;

    const audioA = getAudioA();
    const audioB = getAudioB();
    const nextAudio = activeChannelRef.current === 'A' ? audioB : audioA;
    const prevAudio = activeChannelRef.current === 'A' ? audioA : audioB;

    if (!audioA || !audioB) return;

    const webAudio = initWebAudio(audioA, audioB);
    if (!webAudio || !webAudio.ctx || !webAudio.gainA || !webAudio.gainB) {
      handleNext(true);
      return;
    }

    const ctx = webAudio.ctx;
    const now = ctx.currentTime;
    const activeGain = activeChannelRef.current === 'A' ? webAudio.gainA : webAudio.gainB;
    const inactiveGain = activeChannelRef.current === 'A' ? webAudio.gainB : webAudio.gainA;

    // Crossfade Volume Automation
    activeGain.gain.cancelScheduledValues(now);
    activeGain.gain.setValueAtTime(activeGain.gain.value, now);
    activeGain.gain.linearRampToValueAtTime(0.0, now + 5.0);

    inactiveGain.gain.cancelScheduledValues(now);
    inactiveGain.gain.setValueAtTime(0.0, now);
    inactiveGain.gain.linearRampToValueAtTime(1.0, now + 5.0);

    // Play next track on the inactive channel
    nextAudio.src = nextFile.path;
    nextAudio.currentTime = 0;
    nextAudio.play().catch(e => {
      console.error("Crossfade track playback failed:", e);
    });

    // Update active states
    setQueueIndex(next);
    setCurrentFile(nextFile);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);

    const oldChannel = activeChannelRef.current;
    activeChannelRef.current = activeChannelRef.current === 'A' ? 'B' : 'A';

    // 5 seconds later, clear up the previously active track
    setTimeout(() => {
      prevAudio.pause();
      prevAudio.removeAttribute('src');
      prevAudio.load();
      if (activeChannelRef.current !== oldChannel) {
        crossfadeTriggeredRef.current = false;
      }
    }, 5000);
  }, [handleNext]);

  useEffect(() => {
    const audioA = getAudioA();
    const audioB = getAudioB();
    if (!audioA || !audioB) return;

    const onTimeUpdate = (e: Event) => {
      const audio = e.target as HTMLAudioElement;
      const isActive = (audio === audioA && activeChannelRef.current === 'A') ||
                       (audio === audioB && activeChannelRef.current === 'B');
      if (!isActive) return;

      setCurrentTime(audio.currentTime);

      const dur = audio.duration;
      if (isFinite(dur) && dur > 5 && (dur - audio.currentTime <= 5)) {
        if (!crossfadeTriggeredRef.current) {
          triggerCrossfade(audio);
        }
      }
    };

    const onMeta = (e: Event) => {
      const audio = e.target as HTMLAudioElement;
      const isActive = (audio === audioA && activeChannelRef.current === 'A') ||
                       (audio === audioB && activeChannelRef.current === 'B');
      if (isActive) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      if (crossfadeTriggeredRef.current) return;
      setIsPlaying(false);
      handleNext(true);
    };

    const onError = (e: any) => {
      const audio = e.target as HTMLAudioElement;
      // If the src attribute was removed or emptied, ignore the error
      if (!audio.src || audio.src === window.location.href || audio.src.endsWith('/') || !audio.getAttribute('src')) {
        return;
      }
      console.error("Audio element error:", audio.error);
      setIsPlaying(false);
      showToast("오디오를 재생할 수 없습니다. 파일이 없거나 지원하지 않는 형식입니다.", "error");
    };

    audioA.addEventListener('timeupdate', onTimeUpdate);
    audioA.addEventListener('loadedmetadata', onMeta);
    audioA.addEventListener('ended', onEnded);
    audioA.addEventListener('error', onError);

    audioB.addEventListener('timeupdate', onTimeUpdate);
    audioB.addEventListener('loadedmetadata', onMeta);
    audioB.addEventListener('ended', onEnded);
    audioB.addEventListener('error', onError);

    return () => {
      audioA.removeEventListener('timeupdate', onTimeUpdate);
      audioA.removeEventListener('loadedmetadata', onMeta);
      audioA.removeEventListener('ended', onEnded);
      audioA.removeEventListener('error', onError);

      audioB.removeEventListener('timeupdate', onTimeUpdate);
      audioB.removeEventListener('loadedmetadata', onMeta);
      audioB.removeEventListener('ended', onEnded);
      audioB.removeEventListener('error', onError);
    };
  }, [handleNext, triggerCrossfade, showToast]);

  useEffect(() => {
    const audioA = getAudioA();
    const audioB = getAudioB();
    if (audioA) audioA.volume = volume;
    if (audioB) audioB.volume = volume;
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

    stopAllAudio();
    activeChannelRef.current = 'A';
    const activeAudio = getAudioA();

    setQueueIndex(prev);
    const prevFile = queue[prev];
    setCurrentFile(prevFile);
    setIsPlaying(true);
    
    if (activeAudio && prevFile) {
      activeAudio.src = prevFile.path;
      activeAudio.currentTime = 0;
      activeAudio.play().catch(() => {});
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = getActiveAudio();
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      const audioA = getAudioA();
      const audioB = getAudioB();
      const webAudio = initWebAudio(audioA, audioB);
      if (webAudio && webAudio.ctx) {
        webAudio.ctx.resume();
      }
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seekBy = useCallback((delta: number) => {
    const audio = getActiveAudio();
    if (!audio) return;
    const dur = audio.duration;
    if (!isFinite(dur) || dur === 0) return;
    audio.currentTime = Math.max(0, Math.min(dur, audio.currentTime + delta));
  }, []);

  const seekTo = useCallback((time: number) => {
    const audio = getActiveAudio();
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
      playPlaylistAppend, handlePrev, handleNext, togglePlay, seekBy, seekTo, getMediaEl: getActiveAudio,
      addToQueueNext, addToQueueEnd, playFromQueue, removeFromQueue, toast, showToast, unlockAudioDevice,
      compressorMode, setCompressorMode, compressorSettings, setCompressorSettings
    }}>
      {children}
    </AudioContext.Provider>
  );
}
