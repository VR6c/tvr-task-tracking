'use client';

import { useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, errorMessage } from '@/lib/client/api-client';
import { haptic } from '@/lib/client/telegram';
import { useResource, type Resource } from '@/lib/client/use-resource';
import { isCompletedStatus, type TaskStatus } from '@/lib/constants';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validation';
import type { TaskDTO, TasksResponse } from '@/types/api';

export const isTempId = (id: string): boolean => id.startsWith('temp-');

export type NewTaskPayload = Pick<
  CreateTaskInput,
  'title' | 'category' | 'environment' | 'status' | 'buildVersion' | 'issueRemark'
>;

export interface TasksApi {
  resource: Resource<TasksResponse>;
  addTask: (payload: NewTaskPayload) => Promise<boolean>;
  changeStatus: (task: TaskDTO, status: TaskStatus) => Promise<void>;
  editTask: (task: TaskDTO, patch: UpdateTaskInput) => Promise<boolean>;
  deleteTask: (task: TaskDTO) => Promise<boolean>;
}

const byCreated = (a: TaskDTO, b: TaskDTO): number => a.createdAt.localeCompare(b.createdAt);

const withTasks = (res: TasksResponse, fn: (tasks: TaskDTO[]) => TaskDTO[]): TasksResponse => ({
  ...res,
  tasks: fn(res.tasks),
});

/** Task list for one day with optimistic add / status toggle / edit / delete, each rolling back (and toasting) on failure. */
export function useTasks(date: string | null): TasksApi {
  const resource = useResource<TasksResponse>(date ? `tasks:${date}` : null, (signal) =>
    apiFetch<TasksResponse>(`/api/tasks?date=${date}`, { signal }),
  );
  const { mutate } = resource;
  const toast = useToast();
  const tempCounter = useRef(0);
  const queues = useRef(new Map<string, Promise<unknown>>());

  const patchLocal = useCallback(
    (id: string, patch: Partial<TaskDTO>) =>
      mutate((res) => withTasks(res, (tasks) => tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)))),
    [mutate],
  );

  const addTask = useCallback(
    async (payload: NewTaskPayload): Promise<boolean> => {
      if (!date) return false;
      tempCounter.current += 1;
      const tempId = `temp-${tempCounter.current}`;
      const optimistic: TaskDTO = {
        id: tempId,
        ...payload,
        scheduledDate: date,
        completedAt: isCompletedStatus(payload.status) ? new Date().toISOString() : null,
        isOverDeadline: false,
        monthYear: date.slice(0, 7),
        createdAt: new Date().toISOString(),
      };
      mutate((res) => withTasks(res, (tasks) => [...tasks, optimistic]));
      try {
        const { task } = await apiFetch<{ task: TaskDTO }>('/api/tasks', {
          method: 'POST',
          body: { ...payload, scheduledDate: date },
        });
        mutate((res) => withTasks(res, (tasks) => tasks.map((t) => (t.id === tempId ? task : t))));
        haptic('success');
        return true;
      } catch (error) {
        mutate((res) => withTasks(res, (tasks) => tasks.filter((t) => t.id !== tempId)));
        haptic('error');
        toast.show(`Task not saved: ${errorMessage(error)}`, 'error');
        return false;
      }
    },
    [date, mutate, toast],
  );

  /** Serialises requests per task so rapid taps can't land out of order. */
  const enqueue = useCallback(<T,>(id: string, job: () => Promise<T>): Promise<T> => {
    const run = (queues.current.get(id) ?? Promise.resolve()).then(job, job);
    queues.current.set(id, run.catch(() => undefined));
    return run;
  }, []);

  const send = useCallback(
    async (task: TaskDTO, patch: UpdateTaskInput, revert: Partial<TaskDTO>, optimistic: Partial<TaskDTO>) => {
      patchLocal(task.id, optimistic);
      try {
        const { task: saved } = await enqueue(task.id, () =>
          apiFetch<{ task: TaskDTO }>(`/api/tasks/${task.id}`, { method: 'PATCH', body: patch }),
        );
        patchLocal(task.id, saved);
        return true;
      } catch (error) {
        patchLocal(task.id, revert);
        haptic('error');
        toast.show(`Update failed: ${errorMessage(error)}`, 'error');
        return false;
      }
    },
    [enqueue, patchLocal, toast],
  );

  const changeStatus = useCallback(
    async (task: TaskDTO, status: TaskStatus) => {
      if (isTempId(task.id) || task.status === status) return;
      haptic('select');
      const completing = isCompletedStatus(status);
      await send(
        task,
        { status },
        { status: task.status, completedAt: task.completedAt },
        { status, completedAt: completing ? (task.completedAt ?? new Date().toISOString()) : null },
      );
    },
    [send],
  );

  const editTask = useCallback(
    (task: TaskDTO, patch: UpdateTaskInput) =>
      send(
        task,
        patch,
        {
          title: task.title,
          category: task.category,
          environment: task.environment,
          buildVersion: task.buildVersion,
          issueRemark: task.issueRemark,
          isOverDeadline: task.isOverDeadline,
        },
        {
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.category !== undefined && { category: patch.category }),
          ...(patch.environment !== undefined && { environment: patch.environment }),
          ...(patch.buildVersion !== undefined && { buildVersion: patch.buildVersion }),
          ...(patch.issueRemark !== undefined && { issueRemark: patch.issueRemark }),
          ...(patch.isOverDeadline !== undefined && { isOverDeadline: patch.isOverDeadline }),
        },
      ),
    [send],
  );

  const deleteTask = useCallback(
    async (task: TaskDTO): Promise<boolean> => {
      if (isTempId(task.id)) return false;
      mutate((res) => withTasks(res, (tasks) => tasks.filter((t) => t.id !== task.id)));
      try {
        await enqueue(task.id, () => apiFetch<void>(`/api/tasks/${task.id}`, { method: 'DELETE' }));
        haptic('success');
        return true;
      } catch (error) {
        mutate((res) => withTasks(res, (tasks) => [...tasks, task].sort(byCreated)));
        haptic('error');
        toast.show(`Task not deleted: ${errorMessage(error)}`, 'error');
        return false;
      }
    },
    [enqueue, mutate, toast],
  );

  return { resource, addTask, changeStatus, editTask, deleteTask };
}
