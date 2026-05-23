'use client';

import React from 'react';
import { MediaFile } from '../types';

interface RecentViewProps {
  mediaFiles: MediaFile[];
}

export function RecentView({ mediaFiles }: RecentViewProps) {
  return (
    <div className="bg-[#13161f] rounded-2xl border border-gray-900 overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-[#0f1118]/80 text-gray-500 border-b border-gray-900">
          <tr>
            <th className="px-4 py-3 text-left">Title</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-right">Added</th>
          </tr>
        </thead>
        <tbody>
          {mediaFiles.map(f => (
            <tr key={f.path} className="border-b border-gray-900/40 hover:bg-[#181b24]/40">
              <td className="px-4 py-3 truncate max-w-sm font-semibold text-white">{f.name}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    f.type === 'video' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'
                  }`}
                >
                  {f.type.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-gray-500">
                {f.addedAt ? new Date(f.addedAt).toLocaleDateString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
