import React from 'react';
import { MediaFile } from '../types';
import { useSwipeToQueue } from './useSwipeToQueue';
import { fmtSize } from './SongHelpers';
import { Icon } from './ui/Icon';

interface ListSongRowProps {
  f: MediaFile;
  isSelected: boolean;
  isPlayingFile: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onPlay: () => void;
  onDelete: () => void;
  onMenuClick: (e: React.MouseEvent, track: MediaFile) => void;
  addToQueueNext: (file: MediaFile) => void;
  addToQueueEnd: (file: MediaFile) => void;
  showToast: (msg: string) => void;
}

export function ListSongRow({
  f,
  isSelected,
  isPlayingFile,
  isChecked,
  onSelect,
  onToggleCheck,
  onPlay,
  onDelete,
  onMenuClick,
  addToQueueNext,
  addToQueueEnd,
  showToast
}: ListSongRowProps) {
  const { translateX, isSwiping, touchHandlers } = useSwipeToQueue(f, () => {
    addToQueueEnd(f);
    showToast(`'${f.name.split('/').pop()}'이(가) 대기열 마지막에 추가되었습니다.`);
  });

  return (
    <tr 
      onClick={onSelect} 
      className={`border-b border-gray-900/40 hover:bg-[#181b24]/50 cursor-pointer transition relative ${isSelected ? 'bg-emerald-500/5' : ''}`}
    >
      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
        <input 
          type="checkbox" 
          checked={isChecked} 
          onChange={onToggleCheck} 
          className="w-3.5 h-3.5 rounded bg-[#12131a] border-gray-800 accent-emerald-500 cursor-pointer focus:ring-0" 
        />
      </td>
      
      {/* Sliding content table cell */}
      <td className="px-4 py-3 relative overflow-hidden" {...touchHandlers}>
        {/* Swipe green overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center pl-6 text-white font-bold text-[10px] pointer-events-none transition-opacity duration-150"
          style={{ opacity: translateX > 10 ? 1 : 0 }}
        >
          <span className="flex items-center gap-1.5 animate-pulse">
            ➕ 대기열에 추가됨
          </span>
        </div>
        
        <div 
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
          className="font-semibold text-white truncate max-w-xs"
        >
          {f.name.split('/').pop()}
        </div>
      </td>

      <td className="px-4 py-3 text-center hidden sm:table-cell">
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${f.type === 'video' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>{f.type.toUpperCase()}</span>
      </td>
      
      <td className="px-4 py-3 text-right text-gray-400 font-mono hidden sm:table-cell">{fmtSize(f.size)}</td>
      
      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onPlay} className="text-emerald-400 hover:text-emerald-355 font-semibold flex items-center gap-1 active:scale-95 transition-transform">
            <Icon name="play" size={14} className="fill-emerald-400/20" /> Play
          </button>
          <button 
            onClick={() => {
              addToQueueEnd(f);
              showToast(`'${f.name.split('/').pop()}'이(가) 대기열 마지막에 추가되었습니다.`);
            }} 
            className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Icon name="plus" size={14} /> Queue
          </button>
          <button onClick={onDelete} className="text-rose-400 hover:text-rose-350 font-semibold flex items-center gap-1 active:scale-95 transition-transform">
            <Icon name="trash" size={14} /> Del
          </button>
          <button 
            onClick={(e) => onMenuClick(e, f)}
            className="text-gray-500 hover:text-white p-1 text-sm active:scale-90 transition-transform"
          >
            ︙
          </button>
        </div>
      </td>
    </tr>
  );
}
