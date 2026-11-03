'use client';

import { useState, type FormEvent } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { NewTaskPayload } from '@/components/daily/use-tasks';
import { ChipGroup } from '@/components/ui/Chips';
import { FieldGroup, TextArea, TextField } from '@/components/ui/Field';
import { clearDraft, readDraft, writeDraft } from '@/lib/client/draft-storage';
import { CATEGORY_OPTIONS, ENVIRONMENT_OPTIONS, STATUS_OPTIONS } from '@/lib/client/options';
import { BUILD_VERSION_MAX_LENGTH, TITLE_MAX_LENGTH, type Environment, type TaskCategory, type TaskStatus } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface FormState {
  title: string;
  category: TaskCategory;
  environment: Environment;
  status: TaskStatus;
  buildVersion: string;
  issueRemark: string;
  expanded: boolean;
}

const DRAFT_KEY = 'quick-add';
const INITIAL: FormState = {
  title: '',
  category: 'quick_test',
  environment: 'Development',
  status: 'Feedback',
  buildVersion: '',
  issueRemark: '',
  expanded: false,
};

interface QuickAddCardProps {
  onAdd: (payload: NewTaskPayload) => Promise<boolean>;
}

/** Title + chips stay visible; build version and issue remark sit under a disclosure to keep the card short. */
export function QuickAddCard({ onAdd }: QuickAddCardProps) {
  // Mounted only after hydration (the parent waits for the client-side date), so reading storage here is safe.
  const [form, setForm] = useState<FormState>(() => ({ ...INITIAL, ...readDraft<Partial<FormState>>(DRAFT_KEY)?.value }));
  const [submitting, setSubmitting] = useState(false);

  function update(patch: Partial<FormState>) {
    const next = { ...form, ...patch };
    setForm(next);
    writeDraft(DRAFT_KEY, { value: next, dirty: true });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title || submitting) return;
    setSubmitting(true);
    const snapshot = form;
    // Keep the chosen chips for the next task; clear only the free text.
    const cleared = { ...form, title: '', buildVersion: '', issueRemark: '', status: 'Feedback' as const };
    setForm(cleared);
    writeDraft(DRAFT_KEY, { value: cleared, dirty: true });
    const ok = await onAdd({
      title,
      category: form.category,
      environment: form.environment,
      status: form.status,
      buildVersion: form.buildVersion.trim() || null,
      issueRemark: form.issueRemark.trim() || null,
    });
    setSubmitting(false);
    if (ok) clearDraft(DRAFT_KEY);
    else {
      setForm(snapshot);
      writeDraft(DRAFT_KEY, { value: snapshot, dirty: true });
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} aria-label="Quick add task" className="space-y-3 rounded-lg border border-separator bg-surface p-3">
      <TextField
        label="Task title"
        hideLabel
        value={form.title}
        maxLength={TITLE_MAX_LENGTH}
        enterKeyHint="done"
        placeholder="Task title, e.g. [Product Team] Zoom QR when scan"
        onChange={(e) => update({ title: e.target.value })}
      />
      <ChipGroup label="Category" options={CATEGORY_OPTIONS} value={form.category} onChange={(category) => update({ category })} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <FieldGroup label="Environment">
          <ChipGroup variant="segmented" label="Environment" options={ENVIRONMENT_OPTIONS} value={form.environment} onChange={(environment) => update({ environment })} />
        </FieldGroup>
        <FieldGroup label="Status">
          <ChipGroup variant="segmented" label="Status" options={STATUS_OPTIONS} value={form.status} onChange={(status) => update({ status })} />
        </FieldGroup>
      </div>

      {form.expanded && (
        <div className="space-y-3">
          <TextField
            label="Build version (optional)"
            value={form.buildVersion}
            maxLength={BUILD_VERSION_MAX_LENGTH}
            placeholder="v2.5.15 build 667"
            onChange={(e) => update({ buildVersion: e.target.value })}
          />
          <TextArea
            label="Issue remark (optional)"
            value={form.issueRemark}
            placeholder="[Chat] Member Not Found on profile"
            onChange={(e) => update({ issueRemark: e.target.value })}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-expanded={form.expanded}
          onClick={() => update({ expanded: !form.expanded })}
          className="flex min-h-11 items-center gap-1 text-sm font-medium text-link"
        >
          <ChevronDown aria-hidden className={cn('size-4 transition-transform', form.expanded && 'rotate-180')} />
          Build &amp; issue
        </button>
        <button
          type="submit"
          disabled={!form.title.trim() || submitting}
          className="flex min-h-11 items-center gap-1.5 rounded-md bg-accent px-5 text-[15px] font-semibold text-accent-fg disabled:opacity-50"
        >
          <Plus aria-hidden className="size-4" />
          Add task
        </button>
      </div>
    </form>
  );
}
