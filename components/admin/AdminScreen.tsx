'use client';

import { BotSection } from '@/components/admin/BotSection';
import { JobsSection } from '@/components/admin/JobsSection';
import { StatsSection } from '@/components/admin/StatsSection';
import { TasksSection } from '@/components/admin/TasksSection';
import { ScreenHeader } from '@/components/ScreenHeader';

export function AdminScreen() {
  return (
    <>
      <ScreenHeader title="Admin" subtitle="Bot, scheduled messages and data" />
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-8">
          <StatsSection />
          <BotSection />
          <JobsSection />
        </div>
        <TasksSection />
      </div>
    </>
  );
}
