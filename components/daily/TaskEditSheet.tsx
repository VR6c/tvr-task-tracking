'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ChipGroup } from '@/components/ui/Chips';
import { FieldGroup, TextArea, TextField } from '@/components/ui/Field';
import { clearDraft, readDraft, writeDraft } from '@/lib/client/draft-storage';
import { cn } from '@/lib/cn';
import { CATEGORY_OPTIONS, ENVIRONMENT_OPTIONS } from '@/lib/client/options';
import { BUILD_VERSION_MAX_LENGTH, TITLE_MAX_LENGTH, type Environment, type TaskCategory } from '@/lib/constants';
import type { UpdateTaskInput } from '@/lib/validation';
import type { TaskDTO } from '@/types/api';

interface TaskEditSheetProps {
  task: TaskDTO;
  onSave: (patch: UpdateTaskInput) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onClose: () => void;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href]';

/** Bottom-sheet editor. The issue remark is cached per task so an unsent edit survives a Telegram restart (NFR-04). */
export function TaskEditSheet({ task, onSave, onDelete, onClose }: TaskEditSheetProps) {
  const remarkKey = `remark:${task.id}`;
  const [title, setTitle] = useState(task.title);
  const [category, setCategory] = useState<TaskCategory>(task.category);
  const [environment, setEnvironment] = useState<Environment>(task.environment);
  const [buildVersion, setBuildVersion] = useState(task.buildVersion ?? '');
  const [issueRemark, setIssueRemark] = useState(() => readDraft<string>(remarkKey)?.value ?? task.issueRemark ?? '');
  const [overDeadline, setOverDeadline] = useState(task.isOverDeadline);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.querySelector<HTMLElement>('input')?.focus();
    return () => previous?.focus();
  }, []);

  function trapFocus(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  function changeRemark(value: string) {
    setIssueRemark(value);
    writeDraft(remarkKey, { value, dirty: true });
  }

  async function remove() {
    if (saving) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    const ok = await onDelete();
    setSaving(false);
    if (ok) {
      clearDraft(remarkKey);
      onClose();
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const ok = await onSave({
      title: title.trim(),
      category,
      environment,
      buildVersion: buildVersion.trim() || null,
      issueRemark: issueRemark.trim() || null,
      isOverDeadline: overDeadline,
    });
    setSaving(false);
    if (ok) {
      clearDraft(remarkKey);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/50 md:items-center md:justify-center md:p-6" onKeyDown={trapFocus} onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Edit task"
        onClick={(e) => e.stopPropagation()}
        className="mx-auto max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-lg bg-bg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:max-w-lg md:rounded-lg md:pb-4"
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <h2 className="text-lg font-bold">Edit task</h2>
          <TextField label="Task title" value={title} maxLength={TITLE_MAX_LENGTH} onChange={(e) => setTitle(e.target.value)} />
          <FieldGroup label="Category">
            <ChipGroup label="Category" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          </FieldGroup>
          <FieldGroup label="Environment">
            <ChipGroup label="Environment" options={ENVIRONMENT_OPTIONS} value={environment} onChange={setEnvironment} />
          </FieldGroup>
          <TextField
            label="Build version (optional)"
            value={buildVersion}
            maxLength={BUILD_VERSION_MAX_LENGTH}
            onChange={(e) => setBuildVersion(e.target.value)}
          />
          <TextArea label="Issue remark (optional)" value={issueRemark} onChange={(e) => changeRemark(e.target.value)} />
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={overDeadline}
              onChange={(e) => setOverDeadline(e.target.checked)}
              className="size-5 accent-[var(--color-accent)]"
            />
            Completed / flagged over deadline
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                clearDraft(remarkKey);
                onClose();
              }}
              className="min-h-12 flex-1 rounded-lg bg-surface text-[15px] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="min-h-12 flex-1 rounded-lg bg-accent text-[15px] font-semibold text-accent-fg disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void remove()}
            onBlur={() => setConfirmingDelete(false)}
            disabled={saving}
            className={cn(
              'flex min-h-12 w-full items-center justify-center gap-2 rounded-lg text-[15px] font-semibold text-danger disabled:opacity-50',
              confirmingDelete ? 'bg-danger/15' : 'bg-transparent',
            )}
          >
            <Trash2 aria-hidden className="size-4" />
            {confirmingDelete ? 'Tap again to delete' : 'Delete task'}
          </button>
        </form>
      </div>
    </div>
  );
}
