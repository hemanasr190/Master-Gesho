import { getSupabaseClient } from '@/template';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export type ActivityAction =
  | 'login'
  | 'view_tool'
  | 'save_tool'
  | 'unsave_tool'
  | 'vote_tool'
  | 'unvote_tool'
  | 'rate_tool'
  | 'comment'
  | 'read_post'
  | 'submit_tool'
  | 'follow_developer'
  | 'generate_image'
  | 'ai_chat'
  | 'upload_file';

export const ACTION_LABELS: Record<ActivityAction, string> = {
  login: 'تسجيل دخول',
  view_tool: 'عرض أداة',
  save_tool: 'حفظ أداة',
  unsave_tool: 'إلغاء حفظ أداة',
  vote_tool: 'تصويت على أداة',
  unvote_tool: 'إلغاء تصويت',
  rate_tool: 'تقييم أداة',
  comment: 'إضافة تعليق',
  read_post: 'قراءة مقال',
  submit_tool: 'إرسال أداة',
  follow_developer: 'متابعة مطور',
  generate_image: 'توليد صورة AI',
  ai_chat: 'محادثة AI',
  upload_file: 'رفع ملف',
};

export const ACTION_ICONS: Record<ActivityAction, string> = {
  login: 'login',
  view_tool: 'visibility',
  save_tool: 'bookmark',
  unsave_tool: 'bookmark-border',
  vote_tool: 'arrow-upward',
  unvote_tool: 'arrow-downward',
  rate_tool: 'star',
  comment: 'comment',
  read_post: 'article',
  submit_tool: 'add-circle',
  follow_developer: 'person-add',
  generate_image: 'image',
  ai_chat: 'auto-awesome',
  upload_file: 'upload',
};

export const ACTION_COLORS: Record<ActivityAction, string> = {
  login: '#3B82F6',
  view_tool: '#6B7280',
  save_tool: '#3B82F6',
  unsave_tool: '#6B7280',
  vote_tool: '#22C55E',
  unvote_tool: '#6B7280',
  rate_tool: '#F59E0B',
  comment: '#8B5CF6',
  read_post: '#06B6D4',
  submit_tool: '#10B981',
  follow_developer: '#EC4899',
  generate_image: '#7C3AED',
  ai_chat: '#8B5CF6',
  upload_file: '#F97316',
};

export async function logActivity(
  userId: string,
  action: ActivityAction,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('activity_logs').insert({
    user_id: userId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata || {},
  });
}

export async function fetchActivityLogs(
  userId: string,
  action?: ActivityAction,
  limit = 50
): Promise<ActivityLog[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (action) query = query.eq('action', action);

  const { data } = await query;
  return data || [];
}

export function groupByDate(logs: ActivityLog[]): Record<string, ActivityLog[]> {
  const groups: Record<string, ActivityLog[]> = {};
  logs.forEach(log => {
    const date = new Date(log.created_at).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
  });
  return groups;
}
