'use client';
import React, { createContext, useContext, useState, useRef, ReactNode, useCallback } from 'react';

export type UploadStatus = 'VALIDATING' | 'QUEUED' | 'UPLOADING' | 'SUCCESS' | 'ERROR' | 'CANCELED';

export interface UploadTask {
  id: string;
  file: File;
  progress: number;
  loadedBytes: number;
  totalBytes: number;
  status: UploadStatus;
  errorMessage?: string;
  abortController?: AbortController;
}

interface UploadContextType {
  tasks: UploadTask[];
  enqueueFiles: (files: File[]) => void;
  retryTask: (id: string) => void;
  cancelTask: (id: string) => void;
  dismissTask: (id: string) => void;
  dismissAllTerminal: () => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within UploadProvider');
  return ctx;
}

const MAX_CONCURRENT = 3;
const WARNING_FILE_SIZE = 50 * 1024 * 1024; // 50MB (유저 경고)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const activeCountRef = useRef(0);
  const tasksRef = useRef<UploadTask[]>([]);
  tasksRef.current = tasks;

  const updateTask = (id: string, updates: Partial<UploadTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const processQueue = useCallback(() => {
    const currentTasks = tasksRef.current;
    if (activeCountRef.current >= MAX_CONCURRENT) return;

    const nextTask = currentTasks.find(t => t.status === 'QUEUED');
    if (!nextTask) return;

    activeCountRef.current += 1;
    nextTask.status = 'UPLOADING'; // Mutate directly to prevent consecutive synchronous processQueue calls from picking it up
    updateTask(nextTask.id, { status: 'UPLOADING' });

    const xhr = new XMLHttpRequest();
    const abortController = new AbortController();
    
    // Link abort controller signal to XHR abort
    abortController.signal.addEventListener('abort', () => {
      xhr.abort();
    });

    updateTask(nextTask.id, { abortController });

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        updateTask(nextTask.id, {
          progress: Math.round((e.loaded / e.total) * 100),
          loadedBytes: e.loaded,
          totalBytes: e.total,
        });
      }
    };

    xhr.onload = () => {
      activeCountRef.current -= 1;
      if (xhr.status >= 200 && xhr.status < 300) {
        updateTask(nextTask.id, { status: 'SUCCESS', progress: 100 });
      } else {
        let errorMsg = 'Upload failed';
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.error) errorMsg = res.error;
        } catch {}
        updateTask(nextTask.id, { status: 'ERROR', errorMessage: errorMsg });
      }
      processQueue(); // process next in queue
    };

    xhr.onerror = () => {
      activeCountRef.current -= 1;
      updateTask(nextTask.id, { status: 'ERROR', errorMessage: 'Network Error' });
      processQueue();
    };

    xhr.onabort = () => {
      activeCountRef.current -= 1;
      updateTask(nextTask.id, { status: 'CANCELED' });
      processQueue();
    };

    const formData = new FormData();
    formData.append('file', nextTask.file);

    xhr.open('POST', '/api/media');
    xhr.send(formData);
    
    // Process next if capacity exists
    processQueue();
  }, []);

  const enqueueFiles = useCallback((files: File[]) => {
    const approvedFiles: File[] = [];
    const rejectedTasks: UploadTask[] = [];

    for (const file of files) {
      if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        rejectedTasks.push({
          id: crypto.randomUUID(),
          file,
          progress: 0,
          loadedBytes: 0,
          totalBytes: file.size,
          status: 'ERROR',
          errorMessage: 'Invalid file type. Must be audio or video.'
        });
        continue;
      }

      if (file.size === 0) {
        rejectedTasks.push({
          id: crypto.randomUUID(),
          file,
          progress: 0,
          loadedBytes: 0,
          totalBytes: file.size,
          status: 'ERROR',
          errorMessage: 'File is empty.'
        });
        continue;
      }

      if (file.size > WARNING_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        const confirmUpload = window.confirm(
          `⚠️ 대용량 파일 경고\n\n'${file.name}' 파일의 크기는 ${sizeMB}MB로 50MB를 초과합니다.\n계속 업로드하시겠습니까?`
        );
        if (!confirmUpload) {
          rejectedTasks.push({
            id: crypto.randomUUID(),
            file,
            progress: 0,
            loadedBytes: 0,
            totalBytes: file.size,
            status: 'CANCELED',
            errorMessage: 'User declined large file upload.'
          });
          continue;
        }
      }

      approvedFiles.push(file);
    }

    const newTasks: UploadTask[] = [
      ...rejectedTasks,
      ...approvedFiles.map(file => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        loadedBytes: 0,
        totalBytes: file.size,
        status: 'QUEUED' as UploadStatus,
      }))
    ];

    setTasks(prev => [...prev, ...newTasks]);
    
    // Let state settle, then process
    setTimeout(processQueue, 0);
  }, [processQueue]);

  const retryTask = useCallback((id: string) => {
    updateTask(id, { status: 'QUEUED', errorMessage: undefined, progress: 0, loadedBytes: 0 });
    setTimeout(processQueue, 0);
  }, [processQueue]);

  const cancelTask = useCallback((id: string) => {
    const task = tasksRef.current.find(t => t.id === id);
    if (task?.abortController) {
      task.abortController.abort();
    } else {
      updateTask(id, { status: 'CANCELED' });
    }
  }, []);

  const dismissTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAllTerminal = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status === 'QUEUED' || t.status === 'UPLOADING'));
  }, []);

  // UI Dock render
  const isVisible = tasks.length > 0;
  const activeTasks = tasks.filter(t => t.status === 'QUEUED' || t.status === 'UPLOADING').length;
  
  const overallProgress = tasks.length === 0 ? 0 :
    tasks.reduce((acc, t) => acc + (t.status === 'SUCCESS' ? 100 : (t.status === 'ERROR' || t.status === 'CANCELED' ? 0 : t.progress)), 0) / tasks.length;

  return (
    <UploadContext.Provider value={{ tasks, enqueueFiles, retryTask, cancelTask, dismissTask, dismissAllTerminal }}>
      {children}
      {isVisible && (
        <div className="fixed bottom-6 right-6 w-[400px] bg-[#0b0c10]/90 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[100] flex flex-col overflow-hidden text-gray-200">
          <div className="px-4 py-3 border-b border-gray-800/60 flex items-center justify-between bg-[#12131a]/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              ☁️ Uploads {activeTasks > 0 ? `(${activeTasks} active)` : 'Complete'}
            </h3>
            <button onClick={dismissAllTerminal} className="text-gray-500 hover:text-white text-[10px] font-semibold bg-[#181b24] px-2 py-1 rounded">
              Clear Done
            </button>
          </div>
          
          <div className="h-0.5 w-full bg-gray-900 relative">
            <div className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-300" style={{ width: `${overallProgress}%` }}></div>
          </div>

          <div className="max-h-80 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {tasks.map(t => (
              <div key={t.id} className="p-3 bg-[#13161f] border border-gray-800/80 rounded-xl relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 left-0 h-full bg-emerald-500/5 transition-all duration-300" style={{ width: `${t.progress}%` }}></div>
                <div className="relative z-10 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate max-w-[200px]" title={t.file.name}>{t.file.name}</span>
                    <span className="text-[10px] font-bold">
                      {t.status === 'SUCCESS' && <span className="text-emerald-400">✅ DONE</span>}
                      {t.status === 'ERROR' && <span className="text-rose-400">❌ ERROR</span>}
                      {t.status === 'CANCELED' && <span className="text-gray-500">🚫 CANCELED</span>}
                      {t.status === 'QUEUED' && <span className="text-blue-400 animate-pulse">QUEUED</span>}
                      {t.status === 'UPLOADING' && <span className="text-emerald-400">{t.progress}%</span>}
                    </span>
                  </div>
                  
                  {t.status === 'ERROR' && (
                    <div className="text-[10px] text-rose-400/90 font-medium bg-rose-500/10 p-1.5 rounded mt-1">
                      {t.errorMessage}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-500 font-mono">
                      {(t.loadedBytes / 1024 / 1024).toFixed(1)} / {(t.totalBytes / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <div className="flex gap-2">
                      {(t.status === 'ERROR' || t.status === 'CANCELED') && (
                        <button onClick={() => retryTask(t.id)} className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded transition font-bold">RETRY</button>
                      )}
                      {(t.status === 'UPLOADING' || t.status === 'QUEUED') && (
                        <button onClick={() => cancelTask(t.id)} className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded transition font-bold">CANCEL</button>
                      )}
                      {(t.status === 'SUCCESS' || t.status === 'ERROR' || t.status === 'CANCELED') && (
                        <button onClick={() => dismissTask(t.id)} className="text-[10px] text-gray-500 hover:text-white px-1">✕</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </UploadContext.Provider>
  );
}
