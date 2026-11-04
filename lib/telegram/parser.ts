import {
  TITLE_MAX_LENGTH,
  type Environment,
  type TaskCategory,
  type TaskStatus,
} from '@/lib/constants';

export interface ParsedTask {
  title: string;
  category: TaskCategory;
  environment: Environment;
  status: TaskStatus;
  buildVersion: string | null;
  issueRemark: string | null;
}

export type ParseFailure = 'empty' | 'command' | 'no_title' | 'too_long';
export type ParseResult = { ok: true; task: ParsedTask } | { ok: false; reason: ParseFailure };

const STATUS_TAGS: Record<string, TaskStatus> = {
  success: 'Success',
  succeeded: 'Success',
  done: 'Done',
  completed: 'Done',
  complete: 'Done',
  feedback: 'Feedback',
  pending: 'Feedback',
  todo: 'Feedback',
};

const ENVIRONMENT_TAGS: Record<string, Environment> = {
  dev: 'Development',
  development: 'Development',
  testflight: 'TestFlight',
  tf: 'TestFlight',
  prod: 'Production',
  production: 'Production',
};

const CATEGORY_TAGS: Record<string, TaskCategory> = {
  quicktest: 'quick_test',
  quick_test: 'quick_test',
  quick: 'quick_test',
  feature: 'milestone_feature',
  milestone: 'milestone_feature',
  bug: 'production_bug',
  prodbug: 'production_bug',
  production_bug: 'production_bug',
  idea: 'idea_propose',
  research: 'research_doc',
  doc: 'research_doc',
  template: 'research_doc',
};

/** Keyword fallbacks when no category hashtag is present. Order matters: most specific first. */
const CATEGORY_KEYWORDS: readonly [RegExp, TaskCategory][] = [
  [/\b(production|prod)\s+(bug|error|issue)\b/i, 'production_bug'],
  [/\b(milestone|new feature|feature)\b/i, 'milestone_feature'],
  [/\b(idea|propose[ds]?)\b/i, 'idea_propose'],
  [/\b(research|template|docs?)\b/i, 'research_doc'],
  [/\b(quick\s*test|smoke test|testflight)\b/i, 'quick_test'],
];

const ISSUE_PATTERN = /\b(?:issue|remark)\s*[:=]\s*(.+)$/is;
const VERSION_PATTERN = /\bv(\d+(?:\.\d+){1,3})\b/i;
const BARE_VERSION_PATTERN = /\b(\d+(?:\.\d+){2,3})\b/;
const BUILD_PATTERN = /\bbuild\s*#?\s*(\d+)\b/i;
const HASHTAG_PATTERN = /#([\p{L}\p{N}_]+)/gu;

function extractBuildVersion(text: string): string | null {
  const version = VERSION_PATTERN.exec(text)?.[1] ?? BARE_VERSION_PATTERN.exec(text)?.[1];
  const build = BUILD_PATTERN.exec(text)?.[1];
  const parts = [version ? `v${version}` : null, build ? `build ${build}` : null].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

/**
 * FR-BOT-02: turn a chat message like "Quick Test v2.5.17 build 668 #success" into a task.
 * Defaults: status Feedback; category quick_test; environment Production for bugs, TestFlight when a
 * build is mentioned, otherwise Development. `issue: ...` captures an issue remark.
 */
export function parseTaskMessage(raw: string): ParseResult {
  const text = raw.trim();
  if (!text) return { ok: false, reason: 'empty' };
  if (text.startsWith('/')) return { ok: false, reason: 'command' };

  const tags = [...text.matchAll(HASHTAG_PATTERN)].map((m) => (m[1] ?? '').toLowerCase());
  const withoutTags = text.replace(HASHTAG_PATTERN, ' ');

  const issueMatch = ISSUE_PATTERN.exec(withoutTags);
  const issueRemark = issueMatch?.[1]?.replace(/\s+/g, ' ').trim() || null;
  const body = (issueMatch ? withoutTags.slice(0, issueMatch.index) : withoutTags).replace(/\s+/g, ' ').trim();

  if (!body) return { ok: false, reason: 'no_title' };
  if (body.length > TITLE_MAX_LENGTH) return { ok: false, reason: 'too_long' };

  const buildVersion = extractBuildVersion(body);

  const status = tags.map((t) => STATUS_TAGS[t]).find(Boolean) ?? 'Feedback';
  const category =
    tags.map((t) => CATEGORY_TAGS[t]).find(Boolean) ??
    CATEGORY_KEYWORDS.find(([pattern]) => pattern.test(body))?.[1] ??
    'quick_test';

  const taggedEnvironment = tags.map((t) => ENVIRONMENT_TAGS[t]).find(Boolean);
  const environment: Environment =
    taggedEnvironment ??
    (/\btestflight\b/i.test(body)
      ? 'TestFlight'
      : category === 'production_bug'
        ? 'Production'
        : buildVersion
          ? 'TestFlight'
          : 'Development');

  return { ok: true, task: { title: body, category, environment, status, buildVersion, issueRemark } };
}

export const PARSE_HELP = [
  'I could not turn that into a task. Send a short description, for example:',
  '',
  'Quick Test v2.5.17 build 668 #success',
  'Zoom QR fails on scan #bug issue: camera permission loop',
  'Weekly regression checklist #research #done',
  '',
  'Holiday / leave: today holiday · tomorrow leave · leave 2h · leave morning · leave afternoon · leave full day 10 nov',
  '',
  'Tags: #success #done #feedback · #dev #testflight #prod · #bug #feature #idea #research',
].join('\n');
