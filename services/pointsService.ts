import { getSupabaseClient } from '@/template';

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  level: number;
  updated_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  action: string;
  points: number;
  description: string;
  created_at: string;
}

export interface PointsLevel {
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  icon: string;
}

export const POINTS_LEVELS: PointsLevel[] = [
  { level: 1, title: 'مبتدئ', minPoints: 0, maxPoints: 100, color: '#6B7280', icon: '🌱' },
  { level: 2, title: 'متعلم', minPoints: 100, maxPoints: 300, color: '#3B82F6', icon: '📚' },
  { level: 3, title: 'متقدم', minPoints: 300, maxPoints: 700, color: '#10B981', icon: '⚡' },
  { level: 4, title: 'خبير', minPoints: 700, maxPoints: 1500, color: '#F59E0B', icon: '🏆' },
  { level: 5, title: 'محترف', minPoints: 1500, maxPoints: 3000, color: '#8B5CF6', icon: '💎' },
  { level: 6, title: 'أسطورة', minPoints: 3000, maxPoints: 999999, color: '#EC4899', icon: '👑' },
];

export const POINTS_ACTIONS: Record<string, { points: number; label: string; icon: string }> = {
  comment: { points: 5, label: 'إضافة تعليق', icon: 'comment' },
  vote: { points: 2, label: 'التصويت على أداة', icon: 'arrow-upward' },
  save: { points: 1, label: 'حفظ أداة', icon: 'bookmark' },
  rate: { points: 3, label: 'تقييم أداة', icon: 'star' },
  submit_tool: { points: 50, label: 'إرسال أداة', icon: 'add-circle' },
  ai_chat: { points: 2, label: 'محادثة مع AI', icon: 'auto-awesome' },
  generate_image: { points: 5, label: 'توليد صورة AI', icon: 'image' },
  read_post: { points: 1, label: 'قراءة مقال', icon: 'article' },
  daily_login: { points: 10, label: 'تسجيل يومي', icon: 'login' },
  follow: { points: 3, label: 'متابعة مطور', icon: 'person-add' },
};

export function getLevelForPoints(points: number): PointsLevel {
  for (let i = POINTS_LEVELS.length - 1; i >= 0; i--) {
    if (points >= POINTS_LEVELS[i].minPoints) return POINTS_LEVELS[i];
  }
  return POINTS_LEVELS[0];
}

export function getLevelProgress(points: number, level: PointsLevel): number {
  const range = level.maxPoints - level.minPoints;
  if (range === 0 || range === 999999) return 100;
  return Math.min(100, Math.round(((points - level.minPoints) / range) * 100));
}

export async function fetchUserPoints(userId: string): Promise<UserPoints | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('user_points')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function fetchPointsTransactions(userId: string): Promise<PointsTransaction[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('points_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function addPoints(
  userId: string,
  action: string,
  customPoints?: number,
  customDesc?: string
): Promise<number> {
  const supabase = getSupabaseClient();
  const actionInfo = POINTS_ACTIONS[action];
  const points = customPoints ?? actionInfo?.points ?? 0;
  const description = customDesc ?? actionInfo?.label ?? action;

  if (points === 0) return 0;

  await supabase.from('points_transactions').insert({ user_id: userId, action, points, description });

  const { data: existing } = await supabase
    .from('user_points')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const newTotal = existing.total_points + points;
    const newLevel = getLevelForPoints(newTotal).level;
    await supabase.from('user_points').update({
      total_points: newTotal,
      level: newLevel,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
    return newTotal;
  } else {
    const newLevel = getLevelForPoints(points).level;
    await supabase.from('user_points').insert({
      user_id: userId,
      total_points: points,
      level: newLevel,
    });
    return points;
  }
}
