'use client';

import { useState } from 'react';
import { Task, TaskStatus } from '../types';

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
}

export default function TaskItem({ task, onUpdate }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const statusColors: Record<TaskStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const statusLabels: Record<TaskStatus, string> = {
    pending: '대기',
    in_progress: '진행중',
    completed: '완료',
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    onUpdate(task.id, { status: newStatus });
  };

  const handleCheck = () => {
    onUpdate(task.id, { checked: !task.checked });
  };

  const handleSaveTitle = () => {
    if (title.trim() !== task.title) {
      onUpdate(task.id, { title: title.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <input
        type="checkbox"
        checked={task.checked}
        onChange={handleCheck}
        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      
      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
            className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <p
            className={`cursor-pointer ${task.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}
            onClick={() => setIsEditing(true)}
          >
            {task.title}
          </p>
        )}
      </div>

      <select
        value={task.status}
        onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
        className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${statusColors[task.status]}`}
      >
        <option value="pending">{statusLabels.pending}</option>
        <option value="in_progress">{statusLabels.in_progress}</option>
        <option value="completed">{statusLabels.completed}</option>
      </select>
    </div>
  );
}