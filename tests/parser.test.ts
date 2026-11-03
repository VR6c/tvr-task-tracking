import { describe, expect, it } from 'vitest';
import { parseTaskMessage } from '@/lib/telegram/parser';

function parsed(text: string) {
  const result = parseTaskMessage(text);
  if (!result.ok) throw new Error(`expected success, got ${result.reason}`);
  return result.task;
}

describe('parseTaskMessage', () => {
  it('parses the SRS example', () => {
    expect(parsed('Quick Test v2.5.17 build 668 #success')).toEqual({
      title: 'Quick Test v2.5.17 build 668',
      category: 'quick_test',
      environment: 'TestFlight',
      status: 'Success',
      buildVersion: 'v2.5.17 build 668',
      issueRemark: null,
    });
  });

  it('falls back to sensible defaults', () => {
    expect(parsed('Check onboarding copy')).toMatchObject({
      category: 'quick_test',
      environment: 'Development',
      status: 'Feedback',
      buildVersion: null,
    });
  });

  it('reads category, environment and status from hashtags', () => {
    expect(parsed('Zoom QR when scan #feature #testflight #done')).toMatchObject({
      title: 'Zoom QR when scan',
      category: 'milestone_feature',
      environment: 'TestFlight',
      status: 'Done',
    });
  });

  it('detects categories from keywords and defaults bugs to Production', () => {
    expect(parsed('Production bug: feed duplicates')).toMatchObject({ category: 'production_bug', environment: 'Production' });
    expect(parsed('Propose a shared device sheet')).toMatchObject({ category: 'idea_propose' });
    expect(parsed('Research test template for payments')).toMatchObject({ category: 'research_doc' });
  });

  it('extracts the issue remark', () => {
    expect(parsed('Wallet top-up #bug issue: spinner never stops')).toMatchObject({
      title: 'Wallet top-up',
      issueRemark: 'spinner never stops',
    });
  });

  it('handles build-only and bare-version input', () => {
    expect(parsed('Smoke build 670')).toMatchObject({ buildVersion: 'build 670' });
    expect(parsed('Smoke 2.6.0 build 12')).toMatchObject({ buildVersion: 'v2.6.0 build 12' });
  });

  it('ignores unknown hashtags and is case-insensitive', () => {
    expect(parsed('Regression #SUCCESS #whatever')).toMatchObject({ status: 'Success', title: 'Regression' });
  });

  it.each([
    ['', 'empty'],
    ['    \n ', 'empty'],
    ['/start', 'command'],
    ['/foo bar', 'command'],
    ['#success', 'no_title'],
    ['#done #bug', 'no_title'],
    ['issue: only a remark', 'no_title'],
    ['x'.repeat(256), 'too_long'],
  ])('rejects malformed input %j (%s)', (text, reason) => {
    expect(parseTaskMessage(text)).toEqual({ ok: false, reason });
  });

  it('does not treat a lone number as a version', () => {
    expect(parsed('Retest login 3 times')).toMatchObject({ buildVersion: null });
  });
});
