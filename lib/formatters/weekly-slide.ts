import { REPORT_OWNER } from '@/lib/constants';
import { inline } from '@/lib/formatters/escape';
import { taskLine } from '@/lib/formatters/standup';
import { formatRangeShort, isoWeekNumber, weekRange } from '@/lib/week-utils';
import type { GcinDTO, TaskDTO, WeeklySections } from '@/types/api';

function block(heading: string, lines: string[]): string {
  return [`*${heading}*`, ...(lines.length ? lines : ['_None_'])].join('\n');
}

function gcinLine(letter: string, label: string, value: string): string {
  const text = value.trim();
  return `*${letter} — ${label}:* ${text ? inline(text) : '_—_'}`;
}

/** FR-WK-03: CheckinMe Weekly Meeting slide structure (sections 1-4, then GCIN). */
export function formatWeeklySlide(weekStart: string, sections: WeeklySections, gcin: GcinDTO): string {
  const range = weekRange(weekStart);
  const list = (tasks: readonly TaskDTO[], withRemark = false) =>
    tasks.map((t) => taskLine(t, { withRemark }));

  return [
    '*CheckinMe Weekly Meeting*',
    `Week ${isoWeekNumber(range.start)} · ${formatRangeShort(range)} ${range.end.slice(0, 4)}`,
    `Owner: ${inline(REPORT_OWNER)}`,
    '',
    block('1. Last Week Achievement', list(sections.achievements)),
    '',
    block('2. Plan in This Week', list(sections.plan)),
    '',
    block('3. Tracking Owner Confirm Task', list(sections.tracking)),
    '',
    block('4. Issue Found Register', list(sections.issues, true)),
    '',
    '*GCIN Retrospective*',
    gcinLine('G', 'Good', gcin.good),
    gcinLine('C', 'Challenge', gcin.challenge),
    gcinLine('I', 'Improvement', gcin.improvement),
    gcinLine('N', 'Next Action', gcin.nextAction),
  ].join('\n');
}
