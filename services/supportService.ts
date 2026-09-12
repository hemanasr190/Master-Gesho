import { getSupabaseClient } from '@/template';

export interface SupportTicket {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  sender_id: string;
  content: string;
  is_staff: boolean;
  created_at: string;
}

export const TICKET_CATEGORIES = [
  { id: 'general', label: 'عام', icon: 'help-outline' },
  { id: 'account', label: 'الحساب', icon: 'person' },
  { id: 'technical', label: 'تقني', icon: 'build' },
  { id: 'billing', label: 'الدفع', icon: 'payment' },
  { id: 'bug', label: 'خطأ برمجي', icon: 'bug-report' },
  { id: 'feature', label: 'طلب ميزة', icon: 'lightbulb' },
];

export const TICKET_PRIORITIES = [
  { id: 'low', label: 'منخفض', color: '#22C55E' },
  { id: 'normal', label: 'عادي', color: '#3B82F6' },
  { id: 'high', label: 'مرتفع', color: '#F59E0B' },
  { id: 'urgent', label: 'عاجل', color: '#EF4444' },
];

export const TICKET_STATUSES = [
  { id: 'open', label: 'مفتوح', color: '#3B82F6' },
  { id: 'in_progress', label: 'قيد المعالجة', color: '#F59E0B' },
  { id: 'resolved', label: 'محلول', color: '#22C55E' },
  { id: 'closed', label: 'مغلق', color: '#6B7280' },
];

export async function fetchUserTickets(userId: string): Promise<SupportTicket[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createTicket(
  userId: string,
  title: string,
  description: string,
  category: string,
  priority: string
): Promise<SupportTicket | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('support_tickets')
    .insert({ user_id: userId, title, description, category, priority })
    .select()
    .single();
  return data;
}

export async function fetchTicketReplies(ticketId: string): Promise<TicketReply[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('ticket_replies')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function addTicketReply(
  ticketId: string,
  senderId: string,
  content: string
): Promise<TicketReply | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('ticket_replies')
    .insert({ ticket_id: ticketId, sender_id: senderId, content })
    .select()
    .single();
  return data;
}

export async function rateTicket(ticketId: string, rating: number): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('support_tickets')
    .update({ rating, status: 'closed' })
    .eq('id', ticketId);
  return !error;
}
