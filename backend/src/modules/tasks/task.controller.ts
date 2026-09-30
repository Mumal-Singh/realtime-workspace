import { Response } from 'express';
import { WorkspaceScopedRequest } from '../../middleware/requireRole';
import * as taskService from './task.service';

export async function createTaskHandler(req: WorkspaceScopedRequest, res: Response) {
  const task = await taskService.createTask(req.params.workspaceId, req.params.listId, req.body, req.userId!);
  res.status(201).json(task);
}

export async function updateTaskHandler(req: WorkspaceScopedRequest, res: Response) {
  const task = await taskService.updateTask(req.params.workspaceId, req.params.taskId, req.body, req.userId!);
  res.json(task);
}

export async function deleteTaskHandler(req: WorkspaceScopedRequest, res: Response) {
  await taskService.deleteTask(req.params.workspaceId, req.params.taskId, req.userId!);
  res.status(204).send();
}

export async function moveTaskHandler(req: WorkspaceScopedRequest, res: Response) {
  const { listId, position } = req.body;
  const task = await taskService.moveTask(req.params.workspaceId, req.params.taskId, listId, position, req.userId!);
  res.json(task);
}

export async function searchTasksHandler(req: WorkspaceScopedRequest, res: Response) {
  const { q, assigneeId, status } = req.query;
  const page = Number(req.query.page) || 1;
  const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);

  const result = await taskService.searchTasks(req.params.workspaceId, {
    query: q as string | undefined,
    assigneeId: assigneeId as string | undefined,
    status: status as any,
    page,
    pageSize,
  });
  res.json(result);
}
