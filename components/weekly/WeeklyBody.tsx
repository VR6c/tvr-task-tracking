'use client';

import { AlertOctagon, CheckCheck, ClipboardCheck, ListTodo } from 'lucide-react';
import { GcinCard } from '@/components/weekly/GcinCard';
import { WeeklySectionList } from '@/components/weekly/WeeklySectionList';
import { CopyButton } from '@/components/ui/CopyButton';
import { SaveStatus } from '@/components/ui/SaveStatus';
import { StickyAction } from '@/components/ui/StickyAction';
import { apiFetch } from '@/lib/client/api-client';
import { useAutosaveDoc } from '@/lib/client/use-autosave-doc';
import { formatWeeklySlide } from '@/lib/formatters/weekly-slide';
import type { GcinDTO, WeeklyResponse } from '@/types/api';

const GCIN_FIELDS: {
  field: keyof GcinDTO;
  letter: string;
  title: string;
  hint: string;
  accent: 'ok' | 'warn' | 'info' | 'purple';
}[] = [
  { field: 'good', letter: 'G', title: 'Good', hint: 'Operational wins and test completion throughput', accent: 'ok' },
  { field: 'challenge', letter: 'C', title: 'Challenge', hint: 'Release hurdles, edge-case bugs, late builds', accent: 'warn' },
  { field: 'improvement', letter: 'I', title: 'Improvement', hint: 'Workflow quality and verification process', accent: 'info' },
  { field: 'nextAction', letter: 'N', title: 'Next Action', hint: 'Concrete commitments for the upcoming week', accent: 'purple' },
];

/** Mount with `key={weekStartDate}` so each week gets its own autosave document and draft. */
export function WeeklyBody({ view }: { view: WeeklyResponse }) {
  const gcin = useAutosaveDoc<GcinDTO>({
    storageKey: `gcin:${view.weekStartDate}`,
    server: view.gcin,
    save: async (value) => {
      await apiFetch('/api/weekly/gcin', {
        method: 'POST',
        body: { weekStartDate: view.weekStartDate, weekEndDate: view.weekEndDate, ...value },
      });
    },
  });
  const { sections } = view;

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-3">
          <h2 className="text-base font-bold">This week&apos;s tasks</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
            <WeeklySectionList title="Last Week Achievement" icon={CheckCheck} tasks={sections.achievements} emptyText="Nothing marked Done or Success yet." />
            <WeeklySectionList title="Plan in This Week" icon={ListTodo} tasks={sections.plan} emptyText="No pending or carried-over tasks." />
            <WeeklySectionList title="Tracking Owner Confirm Task" icon={ClipboardCheck} tasks={sections.tracking} emptyText="No TestFlight builds or milestone sign-offs." />
            <WeeklySectionList title="Issue Found Register" icon={AlertOctagon} tasks={sections.issues} emptyText="No issues logged." showRemark />
          </div>
        </div>

        <div className="space-y-3 lg:sticky lg:top-20">
          <h2 className="text-base font-bold">GCIN retrospective</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {GCIN_FIELDS.map(({ field, ...card }) => (
              <GcinCard key={field} {...card} value={gcin.value[field]} onChange={(text) => gcin.update({ ...gcin.value, [field]: text })} />
            ))}
          </div>
          <SaveStatus status={gcin.status} error={gcin.error} onRetry={gcin.retry} />
        </div>
      </div>

      <StickyAction>
        <CopyButton
          label="📤 Copy Slide Format"
          successMessage="Slide format copied"
          getText={() => formatWeeklySlide(view.weekStartDate, sections, gcin.value)}
        />
      </StickyAction>
    </>
  );
}
