import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIImageResult {
  imageUrl: string;
  error: string | null;
}

export interface AIChatResult {
  text: string;
  error: string | null;
}

async function handleFunctionError(error: any): Promise<string> {
  let msg = error?.message || 'Unknown error';
  if (error instanceof FunctionsHttpError) {
    try {
      const code = error.context?.status ?? 500;
      const text = await error.context?.text();
      msg = `[${code}] ${text || msg}`;
    } catch { }
  }
  return msg;
}

export async function generateAIChat(
  messages: ChatMessage[],
  model = 'google/gemini-2.5-flash'
): Promise<AIChatResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { messages, model },
  });
  if (error) return { text: '', error: await handleFunctionError(error) };
  return { text: data?.text || '', error: null };
}

export async function generateAIImage(
  prompt: string,
  aspectRatio = '1:1',
  model = 'google/gemini-2.5-flash-image'
): Promise<AIImageResult> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const { data, error } = await supabase.functions.invoke('ai-image', {
    body: { prompt, aspect_ratio: aspectRatio, model },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (error) return { imageUrl: '', error: await handleFunctionError(error) };
  return { imageUrl: data?.imageUrl || '', error: null };
}

export async function fetchUserGeneratedImages(): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('ai_generated_images')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function deleteGeneratedImage(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('ai_generated_images').delete().eq('id', id);
  return !error;
}
