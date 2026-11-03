'use client';

import { useId } from 'react';
import { SaveStatus } from '@/components/ui/SaveStatus';
import { apiFetch } from '@/lib/client/api-client';
import { useAutosaveDoc } from '@/lib/client/use-autosave-doc';
import type { MonthlyResponse } from '@/types/api';

type Narrative = MonthlyResponse['narrative'];

function NarrativeField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="rounded-xl border border-separator bg-surface p-3">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <p className="mb-2 text-xs text-hint">{hint}</p>
      <textarea
        id={id}
        value={value}
        rows={5}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-32 w-full resize-y rounded-lg border border-separator bg-bg p-2.5 text-[15px]"
      />
    </div>
  );
}

/** Mount with `key={month}`. Autosaves with a localStorage draft, same as the GCIN cards. */
export function NarrativeBlocks({ month, server }: { month: string; server: Narrative }) {
  const doc = useAutosaveDoc<Narrative>({
    storageKey: `narrative:${month}`,
    server,
    save: async (value) => {
      await apiFetch('/api/monthly/narrative', { method: 'POST', body: { month, ...value } });
    },
  });

  return (
    <section aria-labelledby="narrative-heading" className="space-y-3">
      <h2 id="narrative-heading" className="text-base font-bold">
        Monthly narrative
      </h2>
      <NarrativeField
        label="Challenges"
        hint="What made this month hard: blockers, late builds, recurring defects."
        value={doc.value.challenges}
        onChange={(challenges) => doc.update({ ...doc.value, challenges })}
      />
      <NarrativeField
        label="Success Stories"
        hint="Wins worth remembering: bugs caught before release, process improvements."
        value={doc.value.successStories}
        onChange={(successStories) => doc.update({ ...doc.value, successStories })}
      />
      <SaveStatus status={doc.status} error={doc.error} onRetry={doc.retry} />
    </section>
  );
}
