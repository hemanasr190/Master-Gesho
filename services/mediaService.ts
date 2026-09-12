import { getSupabaseClient } from '@/template';

export interface MediaFile {
  id: string;
  user_id: string;
  name: string;
  type: string;
  mime_type: string;
  size: number;
  url: string;
  bucket_path: string;
  folder: string;
  metadata: Record<string, any>;
  created_at: string;
}

export type MediaType = 'all' | 'image' | 'video' | 'document' | 'other';

export async function fetchMediaFiles(
  userId: string,
  type: MediaType = 'all',
  folder = 'root',
  search = ''
): Promise<MediaFile[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('media_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (type !== 'all') query = query.eq('type', type);
  if (folder !== 'root') query = query.eq('folder', folder);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data } = await query;
  return data || [];
}

export async function uploadMediaFile(
  userId: string,
  fileName: string,
  fileData: Uint8Array,
  mimeType: string,
  size: number,
  folder = 'root'
): Promise<MediaFile | null> {
  const supabase = getSupabaseClient();

  const ext = fileName.split('.').pop() || 'bin';
  const bucketPath = `${userId}/${Date.now()}_${fileName}`;
  const type = getFileType(mimeType);

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(bucketPath, fileData, { contentType: mimeType, cacheControl: '3600' });

  if (uploadError) return null;

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(bucketPath);

  const { data } = await supabase
    .from('media_files')
    .insert({
      user_id: userId,
      name: fileName,
      type,
      mime_type: mimeType,
      size,
      url: publicUrl,
      bucket_path: bucketPath,
      folder,
    })
    .select()
    .single();

  return data;
}

export async function deleteMediaFile(file: MediaFile): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error: storageError } = await supabase.storage.from('media').remove([file.bucket_path]);
  if (storageError) return false;
  const { error } = await supabase.from('media_files').delete().eq('id', file.id);
  return !error;
}

export function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'document';
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 ب';
  const k = 1024;
  const sizes = ['ب', 'ك.ب', 'م.ب', 'ج.ب'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileIcon(type: string): string {
  switch (type) {
    case 'image': return 'image';
    case 'video': return 'video-library';
    case 'audio': return 'audiotrack';
    case 'document': return 'description';
    default: return 'insert-drive-file';
  }
}

export function getFileColor(type: string): string {
  switch (type) {
    case 'image': return '#3B82F6';
    case 'video': return '#8B5CF6';
    case 'audio': return '#10B981';
    case 'document': return '#F59E0B';
    default: return '#6B7280';
  }
}
