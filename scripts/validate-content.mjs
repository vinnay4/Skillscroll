// Content pipeline gate (PRD 12 editorial checklist + REQ-003).
// Validates every lesson and series, prints a coverage report against the
// 50-lessons-per-category launch target, and exits non-zero on violations.
// Usage: node --experimental-strip-types scripts/validate-content.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { SEED_LESSONS } = await import(join(root, 'app/src/data/lessons.ts'));
const { SEED_SERIES } = await import(join(root, 'app/src/data/series.ts'));

const CATEGORIES = ['finance', 'technology', 'communication', 'productivity'];
const LANGUAGES = ['en', 'hi'];
const LAUNCH_TARGET_PER_CATEGORY = 50;

const errors = [];
const warnings = [];

// ── Lesson validation ─────────────────────────────────────────────────────
const seenIds = new Set();
for (const lesson of SEED_LESSONS) {
  const at = `lesson ${lesson.id}`;

  if (seenIds.has(lesson.id)) errors.push(`${at}: duplicate id`);
  seenIds.add(lesson.id);

  if (!CATEGORIES.includes(lesson.category)) errors.push(`${at}: unknown category "${lesson.category}"`);
  if (!LANGUAGES.includes(lesson.language)) errors.push(`${at}: unknown language "${lesson.language}"`);

  // REQ-003: 30–60 second duration, enforced at content creation time
  if (lesson.durationSeconds < 30 || lesson.durationSeconds > 60) {
    errors.push(`${at}: duration ${lesson.durationSeconds}s outside the 30–60s window (REQ-003)`);
  }

  // PRD 5.4: single question, exactly 4 options, valid answer index
  if (!Array.isArray(lesson.quizOptions) || lesson.quizOptions.length !== 4) {
    errors.push(`${at}: quiz must have exactly 4 options`);
  }
  if (lesson.quizCorrectIndex < 0 || lesson.quizCorrectIndex > 3) {
    errors.push(`${at}: quizCorrectIndex out of range`);
  }
  if (new Set(lesson.quizOptions).size !== lesson.quizOptions.length) {
    errors.push(`${at}: quiz options must be distinct`);
  }
  if (!lesson.quizQuestion?.trim()) errors.push(`${at}: missing quiz question`);

  // PRD 5.2: mandatory 4-part structure, all parts non-empty
  for (const part of ['structureHook', 'structureConcept', 'structureExample', 'structureTakeaway']) {
    if (!lesson[part]?.trim()) errors.push(`${at}: missing ${part}`);
  }

  // Editorial checklist heuristics
  if (lesson.title.length > 60) warnings.push(`${at}: title over 60 chars (${lesson.title.length})`);
  if (lesson.structureHook.length > 220) warnings.push(`${at}: hook over 220 chars — hooks are 0–5s`);
  if (lesson.structureTakeaway.length > 140) {
    warnings.push(`${at}: takeaway over 140 chars — must be one repeatable sentence`);
  }
  if (!lesson.tryThisToday?.trim()) {
    warnings.push(`${at}: missing "Try this today" prompt (PRD Stage 7 value realization)`);
  }
  if (lesson.qualityScore < 0 || lesson.qualityScore > 100) {
    errors.push(`${at}: qualityScore out of 0–100`);
  }
}

// ── Series validation ─────────────────────────────────────────────────────
const lessonIds = new Set(SEED_LESSONS.map((l) => l.id));
const seenSeriesIds = new Set();
for (const series of SEED_SERIES) {
  const at = `series ${series.id}`;
  if (seenSeriesIds.has(series.id)) errors.push(`${at}: duplicate id`);
  seenSeriesIds.add(series.id);

  // PRD 6.2: series of 5–10 lessons on one sub-topic
  if (series.lessonIds.length < 5 || series.lessonIds.length > 10) {
    errors.push(`${at}: has ${series.lessonIds.length} lessons, expected 5–10`);
  }
  for (const id of series.lessonIds) {
    if (!lessonIds.has(id)) errors.push(`${at}: references unknown lesson "${id}"`);
  }
  if (new Set(series.lessonIds).size !== series.lessonIds.length) {
    errors.push(`${at}: contains duplicate lessons`);
  }
  const seriesLessons = SEED_LESSONS.filter((l) => series.lessonIds.includes(l.id));
  const wrongLang = seriesLessons.filter((l) => l.language !== series.language);
  if (wrongLang.length > 0) {
    errors.push(`${at}: mixes languages (${wrongLang.map((l) => l.id).join(', ')})`);
  }
}

// ── Coverage report ───────────────────────────────────────────────────────
console.log('Content coverage (target: 50 lessons/category at launch, PRD 12):\n');
console.log('  category        en    hi   en-target');
for (const category of CATEGORIES) {
  const en = SEED_LESSONS.filter((l) => l.category === category && l.language === 'en').length;
  const hi = SEED_LESSONS.filter((l) => l.category === category && l.language === 'hi').length;
  const pct = Math.round((en / LAUNCH_TARGET_PER_CATEGORY) * 100);
  console.log(
    `  ${category.padEnd(14)}${String(en).padStart(4)}${String(hi).padStart(6)}   ${pct}%`
  );
}
console.log(`\n  total lessons: ${SEED_LESSONS.length}, series: ${SEED_SERIES.length}`);

if (warnings.length > 0) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✕ ${e}`);
  process.exit(1);
}

console.log('\nAll content checks passed.');
