'use client';

import { useState } from 'react';
import TaskItem from './TaskItem';
import { Task, TaskStatus } from '../types';

interface ChecklistProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export default function Checklist({ tasks, onUpdateTask }: ChecklistProps) {
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [search, setSearch] = useState('');

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status === filter;
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    checked: tasks.filter(t => t.checked).length,
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">📋 체크리스트</h2>
        
        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="bg-gray-100 p-2 rounded text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-600">전체</div>
          </div>
          <div className="bg-yellow-100 p-2 rounded text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
            <div className="text-xs text-yellow-700">대기</div>
          </div>
          <div className="bg-blue-100 p-2 rounded text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.in_progress}</div>
            <div className="text-xs text-blue-700">진행중</div>
          </div>
          <div className="bg-green-100 p-2 rounded text-center">
            <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
            <div className="text-xs text-green-700">완료</div>
          </div>
          <div className="bg-purple-100 p-2 rounded text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.checked}</div>
            <div className="text-xs text-purple-700">체크됨</div>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | TaskStatus)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">전체</option>
            <option value="pending">대기</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTasks.map(task => (
          <TaskItem key={task.id} task={task} onUpdate={onUpdateTask} />
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}