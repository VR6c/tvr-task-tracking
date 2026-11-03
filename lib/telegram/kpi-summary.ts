import { inline } from '@/lib/formatters/escape';
import { KPI_STATUS_LABELS } from '@/lib/kpi/config';
import { formatMonthLabel } from '@/lib/week-utils';
import type { MonthlyResponse } from '@/types/api';

/** Chat-sized KPI snapshot for the Quick Menu: one line per KPI plus the deadline audit counts. */
export function formatKpiSummary(view: MonthlyResponse): string {
  const lines = view.kpis.map(
    (kpi) =>
      `*${inline(kpi.label)}*\n   ${kpi.actual} actual · Good ${kpi.good} · Excellence ${kpi.excellence} — *${KPI_STATUS_LABELS[kpi.status]}*`,
  );
  return [
    `*Monthly KPIs — ${formatMonthLabel(view.month)}*`,
    '',
    ...lines,
    '',
    `Deadline audit: ${view.audit.onTime.length} on time · ${view.audit.overDeadline.length} over deadline`,
  ].join('\n');
}
