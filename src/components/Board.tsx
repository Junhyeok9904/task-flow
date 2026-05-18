'use client';

import { Task, TaskStatus } from '../types';

interface BoardProps {
  tasks: Task[];
}

export default function Board({ tasks }: BoardProps) {
  const columns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'pending', label: '대기', color: 'border-yellow-400' },
    { status: 'in_progress', label: '진행중', color: 'border-blue-400' },
    { status: 'completed', label: '완료', color: 'border-green-400' },
  ];

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(t => t.status === status);
  };

  const getColumnStats = (status: TaskStatus) => {
    const columnTasks = getTasksByStatus(status);
    const checked = columnTasks.filter(t => t.checked).length;
    return { total: columnTasks.length, checked };
  };

  const totalStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">📊 진행 현황 보드</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(column => {
          const stats = getColumnStats(column.status);
          const columnTasks = getTasksByStatus(column.status);
          
          return (
            <div key={column.status} className="bg-gray-50 rounded-lg p-4">
              <div className={`border-t-4 ${column.color} bg-white rounded-b-lg p-4`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">{column.label}</h3>
                  <span className="bg-gray-200 px-2 py-1 rounded text-sm">
                    {stats.checked}/{stats.total}
                  </span>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-3 bg-white rounded shadow-sm border-l-4 ${
                        column.color.replace('border', 'border-l')
                      } ${task.checked ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={task.checked ? 'line-through text-gray-400' : ''}>
                          {task.checked ? '✅' : '⬜'} {task.title}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {task.description}
                      </p>
                    </div>
                  ))}
                </div>
                
                {columnTasks.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    항목 없음
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-bold mb-3">📈 전체 진행률</h3>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${(totalStats.completed / totalStats.total) * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {totalStats.completed} / {totalStats.total} 완료 ({Math.round((totalStats.completed / totalStats.total) * 100)}%)
        </p>
      </div>
    </div>
  );
}