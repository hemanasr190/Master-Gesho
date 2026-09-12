import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Clipboard, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth, useAlert } from '@/template';
import {
  fetchPrompts, fetchMyPrompts, createPrompt, likePrompt, incrementPromptCopies, deletePrompt,
  PROMPT_CATEGORIES, Prompt,
} from '../services/promptsService';

type PromptView = 'browse' | 'my-prompts' | 'new';

function PromptCard({ prompt, theme, userId, onLike, onCopy, onDelete, isOwn }: {
  prompt: Prompt; theme: any; userId?: string; onLike: () => void; onCopy: () => void; onDelete?: () => void; isOwn?: boolean;
}) {
  const cat = PROMPT_CATEGORIES.find(c => c.id === prompt.category);
  const color = cat?.color || '#6B7280';
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[pc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={pc.top}>
        <View style={[pc.catIcon, { backgroundColor: color + '15' }]}>
          <MaterialIcons name={(cat?.icon || 'notes') as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[pc.title, { color: theme.textPrimary }]}>{prompt.title}</Text>
          <View style={[pc.catBadge, { backgroundColor: color + '15' }]}>
            <Text style={[pc.catText, { color }]}>{cat?.label || prompt.category}</Text>
          </View>
        </View>
        {isOwn && onDelete && (
          <Pressable onPress={onDelete} hitSlop={8}>
            <MaterialIcons name="delete-outline" size={18} color={theme.error} />
          </Pressable>
        )}
      </View>

      <Pressable onPress={() => setExpanded(e => !e)}>
        <Text style={[pc.content, { color: theme.textSecondary }]} numberOfLines={expanded ? undefined : 3}>
          {prompt.content}
        </Text>
        {!expanded && <Text style={[pc.expand, { color: theme.primary }]}>عرض الكامل</Text>}
      </Pressable>

      {/* Tags */}
      {prompt.tags.length > 0 && (
        <View style={pc.tagsRow}>
          {prompt.tags.map(tag => (
            <View key={tag} style={[pc.tag, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[pc.tagText, { color: theme.textMuted }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={pc.actions}>
        <Pressable onPress={onLike} style={pc.actionBtn}>
          <MaterialIcons name={prompt.has_liked ? 'favorite' : 'favorite-border'} size={16} color={prompt.has_liked ? '#EF4444' : theme.textMuted} />
          <Text style={[pc.actionText, { color: theme.textMuted }]}>{prompt.likes_count}</Text>
        </Pressable>
        <Pressable onPress={onCopy} style={[pc.copyBtn, { backgroundColor: color + '15', borderColor: color + '30' }]}>
          <MaterialIcons name="content-copy" size={14} color={color} />
          <Text style={[pc.copyText, { color }]}>نسخ البروبمت</Text>
          <Text style={[pc.copyCount, { color: theme.textMuted }]}>{prompt.copies_count}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  catIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 4 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, alignSelf: 'flex-start' },
  catText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  content: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 22, textAlign: 'right' },
  expand: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', marginTop: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  tagText: { fontSize: 10, fontFamily: 'Cairo_500Medium' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
  actionText: { fontSize: 12, fontFamily: 'Cairo_500Medium' },
  copyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9, borderWidth: 1 },
  copyText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  copyCount: { fontSize: 10, fontFamily: 'Cairo_400Regular' },
});

export default function PromptCenterScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [view, setView] = useState<PromptView>('browse');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [myPrompts, setMyPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // New prompt form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tagsInput, setTagsInput] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchPrompts(user?.id, catFilter === 'all' ? undefined : catFilter, search || undefined);
    setPrompts(data);
  }, [user?.id, catFilter, search]);

  const loadMy = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchMyPrompts(user.id);
    setMyPrompts(data);
  }, [user?.id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleLike = useCallback(async (prompt: Prompt) => {
    if (!user?.id) { showAlert('يجب تسجيل الدخول'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrompts(prev => prev.map(p =>
      p.id === prompt.id ? { ...p, has_liked: !p.has_liked, likes_count: p.has_liked ? p.likes_count - 1 : p.likes_count + 1 } : p
    ));
    await likePrompt(prompt.id, user.id, prompt.has_liked || false);
  }, [user?.id, showAlert]);

  const handleCopy = useCallback(async (prompt: Prompt) => {
    Clipboard.setString(prompt.content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await incrementPromptCopies(prompt.id);
    setPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, copies_count: p.copies_count + 1 } : p));
    showAlert('تم النسخ', 'تم نسخ البروبمت للحافظة');
  }, [showAlert]);

  const handleDelete = useCallback(async (prompt: Prompt) => {
    showAlert('حذف البروبمت', 'هل تريد حذف هذا البروبمت؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        const ok = await deletePrompt(prompt.id);
        if (ok) { setMyPrompts(prev => prev.filter(p => p.id !== prompt.id)); Haptics.selectionAsync(); }
      }},
    ]);
  }, [showAlert]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !content.trim()) { showAlert('أدخل العنوان والمحتوى'); return; }
    if (!user?.id) { showAlert('يجب تسجيل الدخول'); return; }
    setSubmitting(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const prompt = await createPrompt(user.id, title.trim(), content.trim(), category, tags, isPublic);
    setSubmitting(false);
    if (prompt) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMyPrompts(prev => [prompt, ...prev]);
      setTitle(''); setContent(''); setCategory('general'); setTagsInput('');
      setView('my-prompts');
      loadMy();
    } else showAlert('خطأ', 'حدث خطأ في إنشاء البروبمت');
  }, [title, content, category, tagsInput, isPublic, user?.id, showAlert, loadMy]);

  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={s.title}>مركز البروبمت</Text>
          <Text style={s.sub}>{prompts.length} بروبمت متاح</Text>
        </View>
        <Pressable onPress={() => { setView(v => v === 'new' ? 'browse' : 'new'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          style={[s.addBtn, { backgroundColor: view === 'new' ? theme.error : '#F59E0B' }]}>
          <MaterialIcons name={view === 'new' ? 'close' : 'add'} size={20} color="#FFF" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {[{ id: 'browse', label: 'استعراض', icon: 'library-books' }, { id: 'my-prompts', label: 'بروبمتاتي', icon: 'person' }].map(tab => (
          <Pressable key={tab.id} style={[s.tab, view === tab.id && { borderBottomColor: '#F59E0B', borderBottomWidth: 2 }]}
            onPress={() => { Haptics.selectionAsync(); setView(tab.id as PromptView); if (tab.id === 'my-prompts') loadMy(); }}>
            <MaterialIcons name={tab.icon as any} size={16} color={view === tab.id ? '#F59E0B' : theme.textMuted} />
            <Text style={[s.tabText, { color: view === tab.id ? '#F59E0B' : theme.textMuted, fontFamily: view === tab.id ? 'Cairo_700Bold' : 'Cairo_500Medium' }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* New Prompt Form */}
      {view === 'new' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
            <Text style={[s.formTitle, { color: theme.textPrimary }]}>بروبمت جديد</Text>

            <View>
              <Text style={s.label}>الفئة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {PROMPT_CATEGORIES.slice(1).map(cat => (
                  <Pressable key={cat.id} style={[s.chip, category === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                    onPress={() => { setCategory(cat.id); Haptics.selectionAsync(); }}>
                    <MaterialIcons name={cat.icon as any} size={12} color={category === cat.id ? '#FFF' : cat.color} />
                    <Text style={[s.chipText, { color: category === cat.id ? '#FFF' : theme.textSecondary }]}>{cat.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <TextInput style={[s.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={title} onChangeText={setTitle} placeholder="عنوان البروبمت *" placeholderTextColor={theme.textMuted} textAlign="right" />

            <TextInput style={[s.textarea, { color: theme.textPrimary, borderColor: theme.border, minHeight: 140 }]}
              value={content} onChangeText={setContent} placeholder="محتوى البروبمت (النص الكامل) *" placeholderTextColor={theme.textMuted}
              multiline textAlign="right" textAlignVertical="top" />

            <TextInput style={[s.input, { color: theme.textPrimary, borderColor: theme.border }]}
              value={tagsInput} onChangeText={setTagsInput} placeholder="الوسوم (مفصولة بفاصلة)" placeholderTextColor={theme.textMuted} textAlign="right" />

            <Pressable onPress={() => setIsPublic(v => !v)} style={[s.publicToggle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialIcons name={isPublic ? 'public' : 'lock'} size={18} color={isPublic ? '#22C55E' : theme.textMuted} />
              <Text style={[s.publicText, { color: isPublic ? '#22C55E' : theme.textSecondary }]}>{isPublic ? 'عام - يمكن للجميع رؤيته' : 'خاص - فقط أنت'}</Text>
            </Pressable>

            <Pressable onPress={handleSubmit} disabled={submitting || !title.trim() || !content.trim()}
              style={[s.submitBtn, { backgroundColor: '#F59E0B', opacity: (!title.trim() || !content.trim() || submitting) ? 0.5 : 1 }]}>
              {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialIcons name="save" size={18} color="#FFF" />}
              <Text style={s.submitText}>حفظ البروبمت</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Browse View */}
      {view === 'browse' && (
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
            <View style={[s.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialIcons name="search" size={18} color={theme.textMuted} />
              <TextInput style={[s.searchInput, { color: theme.textPrimary }]}
                value={search} onChangeText={setSearch}
                placeholder="ابحث في البروبمتات..." placeholderTextColor={theme.textMuted}
                textAlign="right" />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}>
            {PROMPT_CATEGORIES.map(cat => (
              <Pressable key={cat.id} style={[s.chip, catFilter === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => { setCatFilter(cat.id); Haptics.selectionAsync(); }}>
                <Text style={[s.chipText, { color: catFilter === cat.id ? '#FFF' : theme.textSecondary }]}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {loading ? (
            <View style={s.center}><ActivityIndicator size="large" color="#F59E0B" /></View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
              {prompts.length === 0 ? (
                <View style={s.emptyBox}>
                  <MaterialIcons name="library-books" size={52} color={theme.textMuted} />
                  <Text style={s.emptyTitle}>لا توجد بروبمتات</Text>
                </View>
              ) : (
                prompts.map((prompt, i) => (
                  <Animated.View key={prompt.id} entering={FadeInDown.duration(260).delay(Math.min(i * 40, 500))}>
                    <PromptCard prompt={prompt} theme={theme} userId={user?.id}
                      onLike={() => handleLike(prompt)}
                      onCopy={() => handleCopy(prompt)} />
                  </Animated.View>
                ))
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* My Prompts View */}
      {view === 'my-prompts' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {myPrompts.length === 0 ? (
            <View style={s.emptyBox}>
              <MaterialIcons name="add-box" size={52} color={theme.textMuted} />
              <Text style={s.emptyTitle}>لا توجد بروبمتات بعد</Text>
              <Pressable onPress={() => setView('new')} style={[s.submitBtn, { backgroundColor: '#F59E0B', marginTop: 8 }]}>
                <Text style={s.submitText}>إنشاء أول بروبمت</Text>
              </Pressable>
            </View>
          ) : (
            myPrompts.map((prompt, i) => (
              <Animated.View key={prompt.id} entering={FadeInDown.duration(260).delay(i * 40)}>
                <PromptCard prompt={prompt} theme={theme} userId={user?.id}
                  onLike={() => handleLike(prompt)}
                  onCopy={() => handleCopy(prompt)}
                  onDelete={() => handleDelete(prompt)}
                  isOwn />
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: t.textPrimary },
  sub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: t.textMuted, marginTop: 1 },
  addBtn: { marginLeft: 'auto', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13 },
  formTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold' },
  label: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
  chipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  input: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Cairo_400Regular' },
  textarea: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Cairo_400Regular' },
  publicToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  publicText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', flex: 1 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  submitText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', writingDirection: 'rtl' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
});
