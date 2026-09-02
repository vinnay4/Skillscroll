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
  {
    id: 'series-protect-your-money',
    title: 'Protect Your Money',
    description: 'Insurance, credit scores, hidden fees, and the traps that quietly drain wealth.',
    category: 'finance',
    language: 'en',
    lessonIds: ['fin-008', 'fin-009', 'fin-012', 'fin-015', 'fin-013', 'fin-011'],
  },
  {
    id: 'series-digital-self-defence',
    title: 'Digital Self-Defence',
    description: 'Phishing, passwords, permissions, and staying private in a tracked world.',
    category: 'technology',
    language: 'en',
    lessonIds: ['tech-015', 'tech-007', 'tech-011', 'tech-008', 'tech-013', 'tech-014'],
  },
  {
    id: 'series-be-heard-at-work',
    title: 'Be Heard at Work',
    description: 'Pitch yourself, speak up, give feedback, and ask for the raise.',
    category: 'communication',
    language: 'en',
    lessonIds: ['comm-007', 'comm-010', 'comm-008', 'comm-014', 'comm-011', 'comm-013'],
  },
  {
    id: 'series-work-smarter',
    title: 'Work Smarter',
    description: 'Prioritize ruthlessly, batch the noise, and protect your energy and sleep.',
    category: 'productivity',
    language: 'en',
    lessonIds: ['prod-008', 'prod-007', 'prod-013', 'prod-014', 'prod-009', 'prod-015'],
  },
  {
    id: 'series-learn-how-to-learn',
    title: 'Learn How to Learn',
    description: 'Recall, spacing, the Feynman test — the science of making things stick.',
    category: 'productivity',
    language: 'en',
    lessonIds: ['prod-022', 'prod-021', 'prod-024', 'prod-019', 'prod-017', 'prod-016'],
  },
  {
    id: 'series-career-launchpad',
    title: 'Career Launchpad',
    description: 'Resume, pitch, interviews, cold outreach, and the follow-up that converts.',
    category: 'communication',
    language: 'en',
    lessonIds: ['comm-023', 'comm-007', 'comm-001', 'comm-022', 'comm-016', 'comm-015'],
  },
];
