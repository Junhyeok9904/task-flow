import { Task, MediaFile, Playlist } from '../types';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const MEDIA_FILE = path.join(DATA_DIR, 'media.json');
const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Tasks
export function getTasks(): Task[] {
  return readJSON(TASKS_FILE, []);
}

export function saveTasks(tasks: Task[]): void {
  writeJSON(TASKS_FILE, tasks);
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
  saveTasks(tasks);
  return tasks[index];
}

export function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  const tasks = getTasks();
  const newTask: Task = {
    ...task,
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

export function deleteTask(id: string): boolean {
  const tasks = getTasks();
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveTasks(filtered);
  return true;
}

// Initialize with 200 sample tasks
export function initializeTasks(): void {
  const existing = getTasks();
  if (existing.length > 0) return;
  
  const sampleTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = Array.from({ length: 200 }, (_, i) => ({
    title: `작업 항목 ${i + 1}`,
    description: `이것은 작업 항목 ${i + 1}에 대한 설명입니다.`,
    status: 'pending',
    checked: false,
  }));
  
  const tasks: Task[] = sampleTasks.map((t, i) => ({
    ...t,
    id: `task_${i + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  
  saveTasks(tasks);
}

// Media
export function getMediaFiles(): MediaFile[] {
  return readJSON(MEDIA_FILE, []);
}

export function addMediaFile(file: MediaFile): void {
  const files = getMediaFiles();
  files.push(file);
  writeJSON(MEDIA_FILE, files);
}

export function saveMediaFiles(files: MediaFile[]): void {
  writeJSON(MEDIA_FILE, files);
}

// Playlists bulk save (replaces entire file)
export function savePlaylists(playlists: Playlist[]): void {
  writeJSON(PLAYLISTS_FILE, playlists);
}

// Playlists
export function getPlaylists(): Playlist[] {
  return readJSON(PLAYLISTS_FILE, []);
}

export function savePlaylist(playlist: Playlist): void {
  const playlists = getPlaylists();
  const index = playlists.findIndex(p => p.id === playlist.id);
  if (index >= 0) {
    playlists[index] = playlist;
  } else {
    playlists.push(playlist);
  }
  writeJSON(PLAYLISTS_FILE, playlists);
}