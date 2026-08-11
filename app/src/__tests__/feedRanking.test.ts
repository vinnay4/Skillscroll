import { fetchFeed, fetchLessonsByIds, searchLessons } from '../data/api';
import { SEED_LESSONS } from '../data/lessons';
import { SEED_SERIES } from '../data/series';

// Supabase is unconfigured in tests, so these exercise the local rule-based
// ranking path (PRD 9.3: topics → unseen → quality_score).

const noSignals = { seenIds: new Set<string>(), hiddenIds: new Set<string>() };

describe('rule-based feed ranking (PRD 9.3)', () => {
  it('puts lessons matching the onboarding topics first', async () => {
    const feed = await fetchFeed({ topics: ['finance'], language: 'en', ...noSignals, limit: 10 });
    expect(feed).toHaveLength(10);
    expect(feed.every((l) => l.category === 'finance')).toBe(true);
  });

  it('sorts by quality score within the same priority bucket', async () => {
    const feed = await fetchFeed({ topics: ['finance'], language: 'en', ...noSignals, limit: 10 });
    const scores = feed.map((l) => l.qualityScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('deprioritizes seen lessons instead of exhausting the feed', async () => {
    const financeIds = SEED_LESSONS.filter(
      (l) => l.category === 'finance' && l.language === 'en'
    ).map((l) => l.id);
    const feed = await fetchFeed({
      topics: ['finance'],
      language: 'en',
      seenIds: new Set(financeIds),
      hiddenIds: new Set(),
      limit: 10,
    });
    // All finance lessons are seen → unseen lessons from other categories rank first
    expect(feed[0].category).not.toBe('finance');
    expect(feed).toHaveLength(10);
  });

  it('never serves hidden (not interested) lessons', async () => {
    const first = await fetchFeed({ topics: ['finance'], language: 'en', ...noSignals, limit: 1 });
    const hiddenId = first[0].id;
    const feed = await fetchFeed({
      topics: ['finance'],
      language: 'en',
      seenIds: new Set(),
      hiddenIds: new Set([hiddenId]),
      limit: 50,
    });
    expect(feed.find((l) => l.id === hiddenId)).toBeUndefined();
  });

  it('filters strictly by language (REQ-015)', async () => {
    const hindi = await fetchFeed({ topics: [], language: 'hi', ...noSignals, limit: 50 });
    expect(hindi.length).toBeGreaterThan(0);
    expect(hindi.every((l) => l.language === 'hi')).toBe(true);
  });

  it('treats an empty topic list as all topics', async () => {
    const feed = await fetchFeed({ topics: [], language: 'en', ...noSignals, limit: 20 });
    const categories = new Set(feed.map((l) => l.category));
    expect(categories.size).toBeGreaterThan(1);
  });
});

describe('lesson search (PRD 6.2)', () => {
  it('finds lessons by title keyword', async () => {
    const results = await searchLessons('SIP', 'en');
    expect(results.some((l) => l.id === 'fin-002')).toBe(true);
  });

  it('searches concept text, not just titles', async () => {
    const results = await searchLessons('expense ratio', 'en');
    expect(results.some((l) => l.id === 'fin-001')).toBe(true);
  });

  it('returns nothing for queries under 2 characters', async () => {
    expect(await searchLessons('a', 'en')).toEqual([]);
  });

  it('respects the language filter', async () => {
    const results = await searchLessons('API', 'hi');
    expect(results.every((l) => l.language === 'hi')).toBe(true);
  });
});

describe('deep-dive series integrity (PRD 6.2)', () => {
  it('resolves every series lesson id in order', async () => {
    for (const series of SEED_SERIES) {
      const lessons = await fetchLessonsByIds(series.lessonIds);
      expect(lessons.map((l) => l.id)).toEqual(series.lessonIds);
    }
  });

  it('keeps every series within the 5–10 lesson range', () => {
    for (const series of SEED_SERIES) {
      expect(series.lessonIds.length).toBeGreaterThanOrEqual(5);
      expect(series.lessonIds.length).toBeLessThanOrEqual(10);
    }
  });
});
