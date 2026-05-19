import { NextResponse } from 'next/server';
import { getTasks, updateTask, createTask, deleteTask, initializeTasks, saveTasks } from '../../../lib/store';

export async function GET() {
  initializeTasks();
  const tasks = getTasks();
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  if (body.action === 'reorder') {
    saveTasks(body.tasks);
    return NextResponse.json({ success: true });
  }
  
  if (body.action === 'update') {
    const updated = updateTask(body.id, body.updates);
    return NextResponse.json(updated);
  }
  
  if (body.action === 'delete') {
    deleteTask(body.id);
    return NextResponse.json({ success: true });
  }
  
  const newTask = createTask(body);
  return NextResponse.json(newTask);
}