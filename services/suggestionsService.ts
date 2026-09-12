import { getSupabaseClient } from '@/template';

export interface Suggestion {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  votes_count: number;
  created_at: string;
  has_voted?: boolean;
}

export const SUGGESTION_STATUSES = [
  { id: 'pending', label: 'مقترح', color: '#6B7280', icon: 'pending' },
  { id: 'under_review', label: 'قيد الدراسة', color: '#F59E0B', icon: 'find-in-page' },
  { id: 'implemented', label: 'تم التنفيذ', color: '#22C55E', icon: 'check-circle' },
  { id: 'declined', label: 'مرفوض', color: '#EF4444', icon: 'cancel' },
];

export const SUGGESTION_CATEGORIES = [
  { id: 'ui', label: 'واجهة المستخدم', icon: 'dashboard' },
  { id: 'feature', label: 'ميزة جديدة', icon: 'star' },
  { id: 'performance', label: 'الأداء', icon: 'speed' },
  { id: 'ai', label: 'الذكاء الاصطناعي', icon: 'auto-awesome' },
  { id: 'content', label: 'المحتوى', icon: 'article' },
  { id: 'other', label: 'أخرى', icon: 'more-horiz' },
];

export async function fetchSuggestions(userId?: string): Promise<Suggestion[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('suggestions')
    .select('*')
    .order('votes_count', { ascending: false });

  if (!data) return [];

  if (userId) {
    const { data: votes } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id')
      .eq('user_id', userId);
    const votedIds = new Set(votes?.map(v => v.suggestion_id) || []);
    return data.map(s => ({ ...s, has_voted: votedIds.has(s.id) }));
  }

  return data;
}

export async function createSuggestion(
  userId: string,
  title: string,
  description: string,
  category: string
): Promise<Suggestion | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('suggestions')
    .insert({ user_id: userId, title, description, category })
    .select()
    .single();
  return data;
}

export async function voteSuggestion(
  suggestionId: string,
  userId: string,
  hasVoted: boolean
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (hasVoted) {
    const { error } = await supabase
      .from('suggestion_votes')
      .delete()
      .eq('suggestion_id', suggestionId)
      .eq('user_id', userId);
    if (!error) {
      await supabase.rpc('decrement_suggestion_votes', { p_suggestion_id: suggestionId }).catch(() => {
        supabase.from('suggestions').update({ votes_count: supabase.rpc('') as any }).eq('id', suggestionId);
      });
      // Simple decrement
      const { data: s } = await supabase.from('suggestions').select('votes_count').eq('id', suggestionId).single();
      if (s) await supabase.from('suggestions').update({ votes_count: Math.max(0, s.votes_count - 1) }).eq('id', suggestionId);
    }
    return !error;
  } else {
    const { error } = await supabase
      .from('suggestion_votes')
      .insert({ suggestion_id: suggestionId, user_id: userId });
    if (!error) {
      const { data: s } = await supabase.from('suggestions').select('votes_count').eq('id', suggestionId).single();
      if (s) await supabase.from('suggestions').update({ votes_count: s.votes_count + 1 }).eq('id', suggestionId);
    }
    return !error;
  }
}
