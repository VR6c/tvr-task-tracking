import type { TaskCategory } from '@/lib/constants';

/**
 * 2026 Individual KPI targets (SRS FR-MO-01). This is the ONLY place thresholds live.
 * `period: 'week'` targets are multiplied by the number of reporting weeks in the month.
 */
export type KpiPeriod = 'month' | 'week';

export interface KpiDefinition {
  key: 'quick_test' | 'production_error' | 'new_feature' | 'new_idea' | 'research_doc';
  label: string;
  category: TaskCategory;
  period: KpiPeriod;
  good: number;
  excellence: number;
}

export const KPI_DEFINITIONS: readonly KpiDefinition[] = [
  { key: 'quick_test', label: 'Quick Test on TestFlight', category: 'quick_test', period: 'month', good: 3, excellence: 4 },
  { key: 'production_error', label: 'Finding Production Error', category: 'production_bug', period: 'week', good: 1, excellence: 3 },
  { key: 'new_feature', label: 'Testing New Feature (Milestone)', category: 'milestone_feature', period: 'month', good: 4, excellence: 6 },
  { key: 'new_idea', label: 'New Idea Propose', category: 'idea_propose', period: 'month', good: 1, excellence: 3 },
  { key: 'research_doc', label: 'Research Test Template/Doc', category: 'research_doc', period: 'month', good: 1, excellence: 2 },
];

export type KpiStatus = 'Excellence' | 'Good' | 'Under';

export const KPI_STATUS_LABELS: Record<KpiStatus, string> = {
  Excellence: 'Excellence Achieved',
  Good: 'Good',
  Under: 'Under',
};
