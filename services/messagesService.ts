import { getSupabaseClient } from '@/template';

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string | null;
  email: string;
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  return data || [];
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message | null> {
  const supabase = getSupabaseClient();
  const { data: msg, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select()
    .single();
  if (error || !msg) return null;

  await supabase
    .from('conversations')
    .update({ last_message: content, last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return msg;
}

export async function createOrGetConversation(
  userId1: string,
  userId2: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(
      `and(participant_1.eq.${userId1},participant_2.eq.${userId2}),and(participant_1.eq.${userId2},participant_2.eq.${userId1})`
    )
    .maybeSingle();

  if (existing) return existing.id;

  const { data } = await supabase
    .from('conversations')
    .insert({ participant_1: userId1, participant_2: userId2 })
    .select('id')
    .single();

  return data?.id || null;
}

export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('id, username, email')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export function getDisplayName(profile: UserProfile | null): string {
  if (!profile) return 'مستخدم';
  return profile.username || profile.email?.split('@')[0] || 'مستخدم';
}

export function getDisplayInitials(profile: UserProfile | null): string {
  const name = getDisplayName(profile);
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '؟';
}
