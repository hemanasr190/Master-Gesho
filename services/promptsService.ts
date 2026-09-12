import { getSupabaseClient } from '@/template';

export interface Prompt {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  likes_count: number;
  copies_count: number;
  is_public: boolean;
  created_at: string;
  has_liked?: boolean;
}

export const PROMPT_CATEGORIES = [
  { id: 'all', label: 'الكل', icon: 'apps', color: '#3B82F6' },
  { id: 'writing', label: 'كتابة', icon: 'edit', color: '#8B5CF6' },
  { id: 'code', label: 'برمجة', icon: 'code', color: '#10B981' },
  { id: 'image', label: 'صور', icon: 'image', color: '#F59E0B' },
  { id: 'analysis', label: 'تحليل', icon: 'analytics', color: '#EF4444' },
  { id: 'translation', label: 'ترجمة', icon: 'translate', color: '#06B6D4' },
  { id: 'marketing', label: 'تسويق', icon: 'campaign', color: '#EC4899' },
  { id: 'education', label: 'تعليم', icon: 'school', color: '#F97316' },
  { id: 'general', label: 'عام', icon: 'more-horiz', color: '#6B7280' },
];

export async function fetchPrompts(
  userId?: string,
  category?: string,
  search?: string
): Promise<Prompt[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('prompts')
    .select('*')
    .eq('is_public', true)
    .order('likes_count', { ascending: false });

  if (category && category !== 'all') query = query.eq('category', category);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data } = await query;
  if (!data) return [];

  if (userId) {
    const { data: likes } = await supabase
      .from('prompt_likes')
      .select('prompt_id')
      .eq('user_id', userId);
    const likedIds = new Set(likes?.map(l => l.prompt_id) || []);
    return data.map(p => ({ ...p, has_liked: likedIds.has(p.id) }));
  }

  return data;
}

export async function fetchMyPrompts(userId: string): Promise<Prompt[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('prompts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createPrompt(
  userId: string,
  title: string,
  content: string,
  category: string,
  tags: string[],
  isPublic: boolean
): Promise<Prompt | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('prompts')
    .insert({ user_id: userId, title, content, category, tags, is_public: isPublic })
    .select()
    .single();
  return data;
}

export async function likePrompt(
  promptId: string,
  userId: string,
  hasLiked: boolean
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (hasLiked) {
    const { error } = await supabase.from('prompt_likes').delete()
      .eq('prompt_id', promptId).eq('user_id', userId);
    if (!error) {
      const { data: p } = await supabase.from('prompts').select('likes_count').eq('id', promptId).single();
      if (p) await supabase.from('prompts').update({ likes_count: Math.max(0, p.likes_count - 1) }).eq('id', promptId);
    }
    return !error;
  } else {
    const { error } = await supabase.from('prompt_likes').insert({ prompt_id: promptId, user_id: userId });
    if (!error) {
      const { data: p } = await supabase.from('prompts').select('likes_count').eq('id', promptId).single();
      if (p) await supabase.from('prompts').update({ likes_count: p.likes_count + 1 }).eq('id', promptId);
    }
    return !error;
  }
}

export async function incrementPromptCopies(promptId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: p } = await supabase.from('prompts').select('copies_count').eq('id', promptId).single();
  if (p) await supabase.from('prompts').update({ copies_count: p.copies_count + 1 }).eq('id', promptId);
}

export async function deletePrompt(promptId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('prompts').delete().eq('id', promptId);
  return !error;
}
