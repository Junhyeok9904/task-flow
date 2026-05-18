export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  checked: boolean;
}

export interface MediaFile {
  id: string;
  name: string;
  type: 'video' | 'audio';
  path: string;
  size: number;
  addedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: string[];
  createdAt: string;
}