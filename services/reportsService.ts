import { getSupabaseClient } from '@/template';

export interface Report {
  id: string;
  reporter_id: string;
  type: string;
  target_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
}

export const REPORT_TYPES = [
  { id: 'tool', label: 'أداة', icon: 'apps' },
  { id: 'comment', label: 'تعليق', icon: 'comment' },
  { id: 'user', label: 'مستخدم', icon: 'person' },
  { id: 'content', label: 'محتوى', icon: 'article' },
  { id: 'bug', label: 'خطأ تقني', icon: 'bug-report' },
  { id: 'broken_link', label: 'رابط معطوب', icon: 'link-off' },
  { id: 'other', label: 'أخرى', icon: 'more-horiz' },
];

export const REPORT_REASONS = [
  'محتوى مسيء أو غير لائق',
  'معلومات مضللة أو غير دقيقة',
  'انتهاك حقوق الملكية الفكرية',
  'محتوى مزيف أو احتيالي',
  'رسائل عشوائية أو إعلانية',
  'محتوى خطير أو ضار',
  'تحرش أو إساءة',
  'خلل تقني',
  'أخرى',
];

export const REPORT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد المراجعة', color: '#F59E0B' },
  resolved: { label: 'تم الحل', color: '#22C55E' },
  dismissed: { label: 'مرفوض', color: '#6B7280' },
};

export async function submitReport(
  reporterId: string,
  type: string,
  targetId: string,
  reason: string,
  description = ''
): Promise<Report | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('reports')
    .insert({ reporter_id: reporterId, type, target_id: targetId, reason, description })
    .select()
    .single();
  return data;
}

export async function fetchMyReports(userId: string): Promise<Report[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('reports')
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}
