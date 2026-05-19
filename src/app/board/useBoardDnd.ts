import { useState } from 'react';
import { Task, TaskStatus } from '../../types';

export interface DragState {
  draggedTaskId: string | null;
  sourceStatus: TaskStatus | null;
  targetStatus: TaskStatus | null;
  targetIndex: number;
}

export function useBoardDnd(
  tasks: Task[],
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  onUpdateTasksOnServer: (updatedTasks: Task[]) => Promise<void>
) {
  const [dragState, setDragState] = useState<DragState>({
    draggedTaskId: null,
    sourceStatus: null,
    targetStatus: null,
    targetIndex: 0,
  });

  const handleDragStart = (e: React.DragEvent, taskId: string, status: TaskStatus) => {
    // Set drag state
    setDragState({
      draggedTaskId: taskId,
      sourceStatus: status,
      targetStatus: status,
      targetIndex: tasks.filter(t => t.status === status).findIndex(t => t.id === taskId),
    });

    e.dataTransfer.effectAllowed = 'move';
    
    // Set a class on body to indicate dragging (useful for styling cursor, etc.)
    document.body.classList.add('is-dragging');
  };

  const handleDragEnd = () => {
    setDragState({
      draggedTaskId: null,
      sourceStatus: null,
      targetStatus: null,
      targetIndex: 0,
    });
    document.body.classList.remove('is-dragging');
  };

  const handleDragOverColumn = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (dragState.draggedTaskId === null) return;

    // If hovering over column container directly (not on cards), place it at the end
    const columnTasks = tasks.filter(t => t.status === status && t.id !== dragState.draggedTaskId);
    
    // Check if dragging over the empty space below cards
    const target = e.target as HTMLElement;
    const isColumnContainer = target.classList.contains('column-container') || target.classList.contains('column-list');
    
    if (isColumnContainer) {
      setDragState(prev => ({
        ...prev,
        targetStatus: status,
        targetIndex: columnTasks.length,
      }));
    } else {
      setDragState(prev => ({
        ...prev,
        targetStatus: status,
      }));
    }
  };

  const handleDragOverCard = (e: React.DragEvent, targetTaskId: string, targetStatus: TaskStatus, cardIndex: number) => {
    e.preventDefault();
    e.stopPropagation(); // Stop propagation to column container

    if (dragState.draggedTaskId === null || dragState.draggedTaskId === targetTaskId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const threshold = rect.height / 2;
    
    // Calculate new target index based on cursor position (top half vs bottom half of target card)
    const isAfter = relativeY > threshold;
    const newTargetIndex = isAfter ? cardIndex + 1 : cardIndex;

    setDragState(prev => {
      if (prev.targetStatus === targetStatus && prev.targetIndex === newTargetIndex) {
        return prev;
      }
      return {
        ...prev,
        targetStatus,
        targetIndex: newTargetIndex,
      };
    });
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const { draggedTaskId, sourceStatus, targetStatus, targetIndex } = dragState;

    // Reset drag class on body
    document.body.classList.remove('is-dragging');

    if (!draggedTaskId || !sourceStatus || !targetStatus) {
      handleDragEnd();
      return;
    }

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    if (!draggedTask) {
      handleDragEnd();
      return;
    }

    // Find new task parameters (e.g. check/uncheck completion status)
    const updatedTask = { ...draggedTask };
    if (newStatus !== sourceStatus) {
      updatedTask.status = newStatus;
      if (newStatus === 'completed') {
        updatedTask.checked = true;
      } else if (sourceStatus === 'completed') {
        updatedTask.checked = false;
      }
    }

    // 1. Separate all tasks not in the source/target columns to keep their relative order
    const otherTasks = tasks.filter(t => t.status !== sourceStatus && t.status !== newStatus && t.id !== draggedTaskId);

    // 2. Extract tasks for source and target columns
    const sourceColumnTasks = tasks.filter(t => t.status === sourceStatus && t.id !== draggedTaskId);
    
    let newGlobalTasks: Task[] = [];

    if (sourceStatus === newStatus) {
      // Same-column reordering
      const reorderedList = [...sourceColumnTasks];
      
      // Bound the targetIndex to valid list range
      const insertionIndex = Math.min(Math.max(0, targetIndex), reorderedList.length);
      reorderedList.splice(insertionIndex, 0, updatedTask);

      // Rebuild the tasks list: we replace the tasks of this status, preserving others
      newGlobalTasks = tasks.map(t => {
        if (t.status === sourceStatus) {
          // Return the next item from our reordered list
          return reorderedList.shift()!;
        }
        return t;
      });
    } else {
      // Cross-column movement
      const targetColumnTasks = tasks.filter(t => t.status === newStatus && t.id !== draggedTaskId);

      // Insert in target column
      const newTargetList = [...targetColumnTasks];
      const insertionIndex = Math.min(Math.max(0, targetIndex), newTargetList.length);
      newTargetList.splice(insertionIndex, 0, updatedTask);

      // Rebuild global tasks:
      // - Remove draggedTask from source list
      // - Insert draggedTask at targetIndex in target list
      // - Keep other statuses intact
      const sourceList = [...sourceColumnTasks];
      const targetList = [...newTargetList];

      newGlobalTasks = [];
      
      // We iterate over the original list, replacing source tasks from sourceList,
      // target tasks from targetList, and keeping other statuses as is.
      // Any new tasks not accounted for (since we moved one) are handled.
      
      // Let's do a clean mapping:
      tasks.forEach(t => {
        if (t.id === draggedTaskId) {
          // The dragged task was moved, do not place it at its old position
          return;
        }
        if (t.status === sourceStatus) {
          const item = sourceList.shift();
          if (item) newGlobalTasks.push(item);
        } else if (t.status === newStatus) {
          const item = targetList.shift();
          if (item) newGlobalTasks.push(item);
        } else {
          newGlobalTasks.push(t);
        }
      });

      // Append any remaining elements in targetList (if any left due to insertion size mismatch)
      if (targetList.length > 0) {
        newGlobalTasks.push(...targetList);
      }
    }

    // Update state immediately (Optimistic UI)
    setTasks(newGlobalTasks);
    
    // Reset drag state
    handleDragEnd();

    // Persist changes to Server
    try {
      await onUpdateTasksOnServer(newGlobalTasks);
    } catch (err) {
      console.error('Failed to sync reordered tasks to server:', err);
    }
  };

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOverColumn,
    handleDragOverCard,
    handleDrop,
  };
}
