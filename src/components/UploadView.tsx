'use client';

import React from 'react';

interface UploadViewProps {
  dragOver: boolean;
  setDragOver: (val: boolean) => void;
  handleUpload: (files: FileList | null) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function UploadView({ dragOver, setDragOver, handleUpload, onDrop }: UploadViewProps) {
  return (
    <div className="max-w-xl mx-auto py-12">
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-950 hover:border-gray-800 bg-[#13161f]/80'
        }`}
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <p className="text-6xl mb-4">☁️</p>
        <p className="text-base font-bold text-white mb-1">Drag & Drop music or video files</p>
        <p className="text-xs text-gray-500 mb-6">Supports MP3, WAV, M4A, MP4 formats</p>
        <input
          type="file"
          multiple
          accept="audio/*,video/*"
          onChange={e => handleUpload(e.target.files)}
          className="hidden"
          id="file-upload-main"
        />
        <label
          htmlFor="file-upload-main"
          className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-black rounded-lg shadow-lg cursor-pointer text-xs font-bold transition"
        >
          Choose Files
        </label>
      </div>
    </div>
  );
}
