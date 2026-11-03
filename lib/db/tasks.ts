import { and, asc, eq, gte, inArray, lt, lte, or } from 'drizzle-orm';
import { tasks, type NewTaskRow, type TaskRow } from '@/db/schema';
import type { Database } from '@/lib/db/client';
import { buildNewTask, buildTaskPatch } from '@/lib/tasks';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validation';
import type { DateRange } from '@/lib/week-utils';

const order = [asc(tasks.scheduledDate), asc(tasks.createdAt)] as const;

export async function listTasksByDate(db: Database, userId: number, date: string): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.telegramUserId, userId), eq(tasks.scheduledDate, date)))
    .orderBy(...order);
}

export async function createTask(
  db: Database,
  userId: number,
  input: CreateTaskInput,
  now: Date = new Date(),
): Promise<TaskRow> {
  const values: NewTaskRow = buildNewTask(input, userId, now);
  const [row] = await db.insert(tasks).values(values).returning();
  if (!row) throw new Error('Task insert returned no row');
  return row;
}

/** Returns undefined when the task does not exist or belongs to another user. */
export async function updateTask(
  db: Database,
  userId: number,
  id: string,
  input: UpdateTaskInput,
  now: Date = new Date(),
): Promise<TaskRow | undefined> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.telegramUserId, userId)))
      .for('update');
    if (!existing) return undefined;
    const [row] = await tx
      .update(tasks)
      .set(buildTaskPatch(existing, input, now))
      .where(eq(tasks.id, id))
      .returning();
    return row;
  });
}

/** Tasks scheduled inside the window plus still-open tasks scheduled before it (carry-overs). */
export async function listWeekCandidates(db: Database, userId: number, range: DateRange): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.telegramUserId, userId),
        or(
          and(gte(tasks.scheduledDate, range.start), lte(tasks.scheduledDate, range.end)),
          and(lt(tasks.scheduledDate, range.start), eq(tasks.status, 'Feedback')),
        ),
      ),
    )
    .orderBy(...order);
}

export async function listTasksByMonth(db: Database, userId: number, monthYear: string): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.telegramUserId, userId), eq(tasks.monthYear, monthYear)))
    .orderBy(...order);
}

/** Open tasks scheduled before `date` - the carry-over list for the morning digest. */
export async function listCarryOvers(db: Database, userId: number, date: string): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.telegramUserId, userId), eq(tasks.status, 'Feedback'), lt(tasks.scheduledDate, date)))
    .orderBy(...order);
}

export async function listOpenToday(db: Database, userId: number, date: string): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.telegramUserId, userId), eq(tasks.status, 'Feedback'), eq(tasks.scheduledDate, date)))
    .orderBy(...order);
}

export async function deleteTasksByIds(db: Database, ids: string[]): Promise<void> {
  if (ids.length) await db.delete(tasks).where(inArray(tasks.id, ids));
}
