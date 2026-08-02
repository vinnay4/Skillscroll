import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

/** Resolves the caller's public.users row from the request JWT. */
export async function requireUser(req: Request, db: SupabaseClient) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  const { data: authData, error: authError } = await db.auth.getUser(jwt);
  if (authError || !authData.user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { data: user, error } = await db
    .from('users')
    .select('*')
    .eq('auth_id', authData.user.id)
    .single();
  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'User profile not found' }), { status: 404 });
  }
  return user;
}

export const XP_LESSON_COMPLETE = 10;
export const XP_QUIZ_CORRECT = 5;
export const STREAK_BONUS_MULTIPLIER = 1.5;
export const STREAK_BONUS_MIN_DAY = 7;

const LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500];

export function levelForXp(totalXp: number): number {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
}

export function applyStreakBonus(baseXp: number, currentStreak: number): number {
  return currentStreak >= STREAK_BONUS_MIN_DAY
    ? Math.round(baseXp * STREAK_BONUS_MULTIPLIER)
    : baseXp;
}

/** Local calendar date (YYYY-MM-DD) in the user's timezone. */
export function localDate(timezone: string, date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
