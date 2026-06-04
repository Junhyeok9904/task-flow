import React, { useState, useCallback, useRef } from 'react';
import { MediaFile } from '../types';
import { useAudioPlayer } from '../contexts/AudioProvider';

export function useSwipeToQueue(track: MediaFile, onSwipeSuccess: () => void) {
  const { unlockAudioDevice } = useAudioPlayer();
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const translateXRef = useRef(0);
  const touchStartedRef = useRef(false);
  const horizontalLockRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    touchStartedRef.current = true;
    horizontalLockRef.current = false;
    translateXRef.current = 0;
    setTranslateX(0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartedRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    if (deltaX < 0) {
      translateXRef.current = 0;
      setTranslateX(0);
      return;
    }

    if (!horizontalLockRef.current) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        horizontalLockRef.current = true;
        setIsSwiping(true);
      }
    }

    if (horizontalLockRef.current) {
      if (e.cancelable) e.preventDefault();
      const dragDistance = deltaX > 150 ? 150 + (deltaX - 150) * 0.25 : deltaX;
      translateXRef.current = dragDistance;
      setTranslateX(dragDistance);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStartedRef.current) return;
    touchStartedRef.current = false;

    if (horizontalLockRef.current) {
      if (translateXRef.current > 80) {
        unlockAudioDevice();
        onSwipeSuccess();
      }
    }

    setIsSwiping(false);
    translateXRef.current = 0;
    setTranslateX(0);
    horizontalLockRef.current = false;
  }, [onSwipeSuccess]);

  return {
    translateX,
    isSwiping,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    }
  };
}
