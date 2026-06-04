import React from 'react';
import { MediaFile } from '../types';
import { useSwipeToQueue } from './useSwipeToQueue';
import { Icon } from './ui/Icon';

interface PlaylistTrackItemProps {
  item: MediaFile;
  onPlay: () => void;
  onMenuClick: (e: React.MouseEvent, track: MediaFile) => void;
  addToQueueNext: (file: MediaFile) => void;
  addToQueueEnd: (file: MediaFile) => void;
  showToast: (msg: string) => void;
}

export function PlaylistTrackItem({
  item,
  onPlay,
  onMenuClick,
  addToQueueNext,
  addToQueueEnd,
  showToast
}: PlaylistTrackItemProps) {
  const { translateX, isSwiping, touchHandlers } = useSwipeToQueue(item, () => {
    addToQueueEnd(item);
    showToast(`'${item.name.split('/').pop()}'이(가) 대기열 마지막에 추가되었습니다.`);
  });

  return (
    <div className="relative overflow-hidden rounded border border-gray-900/60 bg-[#08090d]/60">
      {/* Green swipe reveal */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center pl-6 text-white font-bold text-[10px] pointer-events-none transition-opacity duration-150"
        style={{ opacity: translateX > 10 ? 1 : 0 }}
      >
        <span className="flex items-center gap-1.5 animate-pulse">
          ➕ 대기열에 추가됨
        </span>
      </div>

      <div
        {...touchHandlers}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
        className="flex items-center justify-between p-2 relative z-10 bg-[#08090d]/90 hover:bg-[#13161f] transition-all"
      >
        <span className="text-xs truncate max-w-[120px] text-gray-300">{item.name.split('/').pop()}</span>
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={onPlay} className="text-emerald-400 hover:text-emerald-355 transition flex items-center justify-center p-1" title="Play">
            <Icon name="play" size={12} className="fill-emerald-400/20" />
          </button>
          <button 
            onClick={(e) => onMenuClick(e, item)}
            className="text-gray-500 hover:text-white transition flex items-center justify-center p-1"
          >
            ︙
          </button>
        </div>
      </div>
    </div>
  );
}
