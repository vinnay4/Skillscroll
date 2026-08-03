import type { Series } from '../types';

/**
 * Topic deep-dives (PRD 6.2, Phase 2): pedagogically ordered series built from
 * the lesson library. Mirrored in supabase/seed/seed_series.sql.
 */
export const SEED_SERIES: Series[] = [
  {
    id: 'series-money-basics',
    title: 'Money Basics',
    description: 'From your first emergency fund to picking the right mutual fund plan — in order.',
    category: 'finance',
    language: 'en',
    lessonIds: ['fin-003', 'fin-006', 'fin-004', 'fin-002', 'fin-005', 'fin-001'],
  },
  {
    id: 'series-focus-fundamentals',
    title: 'Focus Fundamentals',
    description: 'Beat procrastination, build deep-work blocks, and make habits stick.',
    category: 'productivity',
    language: 'en',
    lessonIds: ['prod-001', 'prod-005', 'prod-002', 'prod-003', 'prod-004', 'prod-006'],
  },
  {
    id: 'series-speak-with-impact',
    title: 'Speak with Impact',
    description: 'Interviews, negotiations, emails, and presentations that land.',
    category: 'communication',
    language: 'en',
    lessonIds: ['comm-001', 'comm-004', 'comm-003', 'comm-005', 'comm-002', 'comm-006'],
  },
  {
    id: 'series-tech-literacy',
    title: 'Tech Literacy 101',
    description: 'APIs, the cloud, caching, and AI — the concepts behind every app you use.',
    category: 'technology',
    language: 'en',
    lessonIds: ['tech-001', 'tech-006', 'tech-002', 'tech-004', 'tech-003', 'tech-005'],
  },
];
