import { useState, useRef, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from '../../types';

// constants
const DRAG_THRESHOLD = 8; // 8px minimum movement before starting drag
const EDGE_SIZE = 70;      // 70px from top/bottom boundary triggers scroll
const MAX_SCROLL_SPEED = 18; // maximum scroll speed in pixels per frame

export interface DragState {
  draggedTaskId: string | null;
  sourceStatus: TaskStatus | null;
  targetStatus: TaskStatus | null;
  targetIndex: number;
  isDragging: boolean;
}

export interface GhostState {
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  title: string;
  description?: string;
  status: TaskStatus;
}

export function usePointerDnd(
  tasks: Task[],
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  onUpdateTasksOnServer: (updatedTasks: Task[]) => Promise<void>
) {
  const [dragState, setDragState] = useState<DragState>({
    draggedTaskId: null,
    sourceStatus: null,
    targetStatus: null,
    targetIndex: 0,
    isDragging: false,
  });

  const [ghost, setGhost] = useState<GhostState | null>(null);

  // Refs to avoid stale state in event listeners
  const tasksRef = useRef<Task[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const stateRef = useRef<DragState>(dragState);
  useEffect(() => {
    stateRef.current = dragState;
  }, [dragState]);

  // Session coordinates
  const sessionRef = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    taskId: string;
    status: TaskStatus;
    title: string;
    description?: string;
  } | null>(null);

  // Auto-scroll loop refs
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const scrollSpeedRef = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  
  // Last pointer coordinates to re-trigger target updates while container is scrolling
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update target index and status based on coordinates
  const updateDragTarget = useCallback((clientX: number, clientY: number) => {
    lastPointerPos.current = { x: clientX, y: clientY };

    if (!sessionRef.current) return;

    // Use document.elementFromPoint to find layout elements under the cursor
    // Since ghost card will have pointer-events: none, this resolves to the cards/columns behind it.
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return;

    const columnContainer = element.closest('.column-container') as HTMLElement | null;
    const cardElement = element.closest('[data-task-id]') as HTMLElement | null;

    if (!columnContainer) {
      // Hovering outside any columns
      setDragState(prev => {
        if (prev.targetStatus === null) return prev;
        return { ...prev, targetStatus: null, targetIndex: 0 };
      });
      stopAutoScroll();
      return;
    }

    const currentStatus = columnContainer.getAttribute('data-status') as TaskStatus;
    const columnTasks = tasksRef.current.filter(t => t.status === currentStatus && t.id !== sessionRef.current?.taskId);

    // Setup scrolling on the active column items scrollbox
    const scrollBox = columnContainer.querySelector('.column-list') as HTMLElement | null;
    if (scrollBox) {
      handleAutoScrollCheck(scrollBox, clientY);
    }

    if (cardElement) {
      const cardStatus = cardElement.getAttribute('data-status') as TaskStatus;
      const cardIndex = parseInt(cardElement.getAttribute('data-index') || '0', 10);
      
      const rect = cardElement.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      
      // Determine if cursor is above or below middle line of hovered card
      const isBelowMiddle = relativeY > rect.height / 2;
      const targetIndex = isBelowMiddle ? cardIndex + 1 : cardIndex;

      setDragState(prev => {
        if (prev.targetStatus === cardStatus && prev.targetIndex === targetIndex) {
          return prev;
        }
        return {
          ...prev,
          targetStatus: cardStatus,
          targetIndex,
        };
      });
    } else {
      // Pointer is over the column container but not hovering a specific card (empty space)
      setDragState(prev => {
        if (prev.targetStatus === currentStatus && prev.targetIndex === columnTasks.length) {
          return prev;
        }
        return {
          ...prev,
          targetStatus: currentStatus,
          targetIndex: columnTasks.length,
        };
      });
    }
  }, []);

  // Auto Scroll engine
  const handleAutoScrollCheck = (scrollBox: HTMLElement, clientY: number) => {
    const rect = scrollBox.getBoundingClientRect();
    const canScrollUp = scrollBox.scrollTop > 0;
    const canScrollDown = scrollBox.scrollTop < (scrollBox.scrollHeight - scrollBox.clientHeight);

    if (clientY < rect.top + EDGE_SIZE && canScrollUp) {
      // Scroll Up
      const distance = (rect.top + EDGE_SIZE) - clientY;
      const factor = Math.min(1, distance / EDGE_SIZE);
      scrollContainerRef.current = scrollBox;
      scrollDirectionRef.current = 'up';
      scrollSpeedRef.current = factor * MAX_SCROLL_SPEED;
      
      if (animationFrameId.current === null) {
        animationFrameId.current = requestAnimationFrame(scrollLoop);
      }
    } else if (clientY > rect.bottom - EDGE_SIZE && canScrollDown) {
      // Scroll Down
      const distance = clientY - (rect.bottom - EDGE_SIZE);
      const factor = Math.min(1, distance / EDGE_SIZE);
      scrollContainerRef.current = scrollBox;
      scrollDirectionRef.current = 'down';
      scrollSpeedRef.current = factor * MAX_SCROLL_SPEED;

      if (animationFrameId.current === null) {
        animationFrameId.current = requestAnimationFrame(scrollLoop);
      }
    } else {
      stopAutoScroll();
    }
  };

  const scrollLoop = useCallback(() => {
    if (!scrollContainerRef.current || !scrollDirectionRef.current) {
      animationFrameId.current = null;
      return;
    }

    const dir = scrollDirectionRef.current === 'up' ? -1 : 1;
    scrollContainerRef.current.scrollTop += dir * scrollSpeedRef.current;

    // Recalculate target card under cursor as viewport moves
    updateDragTarget(lastPointerPos.current.x, lastPointerPos.current.y);

    animationFrameId.current = requestAnimationFrame(scrollLoop);
  }, [updateDragTarget]);

  const stopAutoScroll = () => {
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    scrollContainerRef.current = null;
    scrollDirectionRef.current = null;
    scrollSpeedRef.current = 0;
  };

  // Pointer move handler
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!sessionRef.current) return;
    const session = sessionRef.current;

    // Coordinate check
    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (!stateRef.current.isDragging) {
      if (distance > DRAG_THRESHOLD) {
        // Formally initiate Drag Session
        setDragState({
          draggedTaskId: session.taskId,
          sourceStatus: session.status,
          targetStatus: session.status,
          targetIndex: tasksRef.current.filter(t => t.status === session.status).findIndex(t => t.id === session.taskId),
          isDragging: true,
        });
        document.body.classList.add('is-dragging');
      }
      return;
    }

    // Update Ghost overlay coordinates
    setGhost({
      x: e.clientX,
      y: e.clientY,
      width: session.width,
      height: session.height,
      offsetX: session.offsetX,
      offsetY: session.offsetY,
      title: session.title,
      description: session.description,
      status: session.status,
    });

    // Update targets
    updateDragTarget(e.clientX, e.clientY);
  }, [updateDragTarget]);

  // Pointer release / Drop handler
  const handlePointerUp = useCallback(async (e: PointerEvent) => {
    stopAutoScroll();
    
    // Clean up event listeners immediately
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);

    const activeState = stateRef.current;
    const session = sessionRef.current;

    document.body.classList.remove('is-dragging');

    if (!session) return;
    sessionRef.current = null;
    setGhost(null);

    // If session ended before threshold was reached
    if (!activeState.isDragging || !activeState.draggedTaskId || !activeState.sourceStatus || !activeState.targetStatus) {
      setDragState({
        draggedTaskId: null,
        sourceStatus: null,
        targetStatus: null,
        targetIndex: 0,
        isDragging: false,
      });
      return;
    }

    const { draggedTaskId, sourceStatus, targetStatus, targetIndex } = activeState;
    const draggedTask = tasksRef.current.find(t => t.id === draggedTaskId);

    if (!draggedTask) {
      setDragState({
        draggedTaskId: null,
        sourceStatus: null,
        targetStatus: null,
        targetIndex: 0,
        isDragging: false,
      });
      return;
    }

    // Set dragging state back to inactive
    setDragState({
      draggedTaskId: null,
      sourceStatus: null,
      targetStatus: null,
      targetIndex: 0,
      isDragging: false,
    });

    const updatedTask = { ...draggedTask };
    const newStatus = targetStatus;

    if (newStatus !== sourceStatus) {
      updatedTask.status = newStatus;
      if (newStatus === 'completed') {
        updatedTask.checked = true;
      } else if (sourceStatus === 'completed') {
        updatedTask.checked = false;
      }
    }

    // 1. Separate unaffected tasks
    const sourceColumnTasks = tasksRef.current.filter(t => t.status === sourceStatus && t.id !== draggedTaskId);
    let newGlobalTasks: Task[] = [];

    if (sourceStatus === newStatus) {
      // Same-column reordering
      const reorderedList = [...sourceColumnTasks];
      const insertionIndex = Math.min(Math.max(0, targetIndex), reorderedList.length);
      reorderedList.splice(insertionIndex, 0, updatedTask);

      newGlobalTasks = tasksRef.current.map(t => {
        if (t.status === sourceStatus) {
          return reorderedList.shift()!;
        }
        return t;
      });
    } else {
      // Cross-column movement
      const targetColumnTasks = tasksRef.current.filter(t => t.status === newStatus && t.id !== draggedTaskId);
      const newTargetList = [...targetColumnTasks];
      const insertionIndex = Math.min(Math.max(0, targetIndex), newTargetList.length);
      newTargetList.splice(insertionIndex, 0, updatedTask);

      const sourceList = [...sourceColumnTasks];
      const targetList = [...newTargetList];

      newGlobalTasks = [];
      tasksRef.current.forEach(t => {
        if (t.id === draggedTaskId) return;
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

      if (targetList.length > 0) {
        newGlobalTasks.push(...targetList);
      }
    }

    // Update state synchronously for zero-latency feedback
    setTasks(newGlobalTasks);

    // Push updates to remote storage
    try {
      await onUpdateTasksOnServer(newGlobalTasks);
    } catch (err) {
      console.error('Failed to sync tasks reorder over pointer event:', err);
    }
  }, [handlePointerMove, setTasks, onUpdateTasksOnServer]);

  // Entry point for card clicks / touches
  const handlePointerDown = useCallback((
    e: React.PointerEvent<HTMLElement>,
    taskId: string,
    status: TaskStatus,
    title: string,
    description?: string
  ) => {
    // Only capture primary pointer down (left click / touch)
    if (e.button !== 0) return;

    // Prevent text selection or default scroll interactions during dragging setup
    const cardElement = e.currentTarget;
    const rect = cardElement.getBoundingClientRect();

    // Session initialization
    sessionRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      taskId,
      status,
      title,
      description,
    };

    // Attach listeners globally to track mouse/touch movement outside layout boundaries
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  // Clean animation loops on unmount to prevent leaks
  useEffect(() => {
    return () => {
      stopAutoScroll();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return {
    dragState,
    ghost,
    handlePointerDown,
  };
}
