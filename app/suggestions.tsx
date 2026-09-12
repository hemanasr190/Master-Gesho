import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl,
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
  fetchSuggestions, createSuggestion, voteSuggestion,
  SUGGESTION_STATUSES, SUGGESTION_CATEGORIES, Suggestion,
} from '../services/suggestionsService';

const STATUS_FILTERS = [{ id: 'all', label: 'الكل' }, ...SUGGESTION_STATUSES];

function SuggestionCard({ suggestion, theme, onVote, isOwn }: {
  suggestion: Suggestion; theme: any; onVote: () => void; isOwn: boolean;
}) {
  const status = SUGGESTION_STATUSES.find(s => s.id === suggestion.status) || SUGGESTION_STATUSES[0];
  const cat = SUGGESTION_CATEGORIES.find(c => c.id === suggestion.category);
  const date = new Date(suggestion.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });

  return (
    <View style={[sv.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {/* Vote button */}
        <Pressable onPress={onVote} style={[sv.voteBtn, suggestion.has_voted && { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
          <MaterialIcons name="arrow-upward" size={18} color={suggestion.has_voted ? theme.primary : theme.textMuted} />
          <Text style={[sv.voteCount, { color: suggestion.has_voted ? theme.primary : theme.textSecondary }]}>
            {suggestion.votes_count}
          </Text>
        </Pressable>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={[sv.title, { color: theme.textPrimary }]}>{suggestion.title}</Text>
          </View>
          <Text style={[sv.desc, { color: theme.textSecondary }]} numberOfLines={2}>{suggestion.description}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <View style={[sv.badge, { backgroundColor: status.color + '15' }]}>
              <MaterialIcons name={status.icon as any} size={11} color={status.color} />
              <Text style={[sv.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
            {cat && (
              <View style={[sv.badge, { backgroundColor: theme.backgroundSecondary }]}>
                <MaterialIcons name={cat.icon as any} size={11} color={theme.textMuted} />
                <Text style={[sv.badgeText, { color: theme.textMuted }]}>{cat.label}</Text>
              </View>
            )}
            <Text style={[sv.date, { color: theme.textMuted }]}>{date}</Text>
            {isOwn && (
              <View style={[sv.badge, { backgroundColor: theme.primary + '15' }]}>
                <Text style={[sv.badgeText, { color: theme.primary }]}>اقتراحي</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const sv = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  voteBtn: { alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1', minWidth: 48 },
  voteCount: { fontSize: 13, fontFamily: 'Cairo_700Bold' },
  title: { fontSize: 15, fontFamily: 'Cairo_700Bold', flex: 1 },
  desc: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 20, textAlign: 'right' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  badgeText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  date: { fontSize: 10, fontFamily: 'Cairo_400Regular', marginLeft: 'auto' },
});

export default function SuggestionsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('feature');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchSuggestions(user?.id);
    setSuggestions(data);
  }, [user?.id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleVote = useCallback(async (suggestion: Suggestion) => {
    if (!user?.id) { showAlert('يجب تسجيل الدخول للتصويت'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSuggestions(prev => prev.map(s =>
      s.id === suggestion.id
        ? { ...s, has_voted: !s.has_voted, votes_count: s.has_voted ? s.votes_count - 1 : s.votes_count + 1 }
        : s
    ));
    await voteSuggestion(suggestion.id, user.id, suggestion.has_voted || false);
  }, [user?.id, showAlert]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !description.trim()) { showAlert('أدخل العنوان والتفاصيل'); return; }
    if (!user?.id) { showAlert('يجب تسجيل الدخول'); return; }
    setSubmitting(true);
    const newSuggestion = await createSuggestion(user.id, title.trim(), description.trim(), category);
    setSubmitting(false);
    if (newSuggestion) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuggestions(prev => [{ ...newSuggestion, has_voted: false }, ...prev]);
      setTitle(''); setDescription(''); setCategory('feature');
      setShowForm(false);
      showAlert('تم الإرسال', 'شكراً لاقتراحك! سنراجعه قريباً');
    } else showAlert('خطأ', 'حدث خطأ في إرسال الاقتراح');
  }, [title, description, category, user?.id, showAlert]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return suggestions;
    return suggestions.filter(s => s.status === statusFilter);
  }, [suggestions, statusFilter]);

  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={s.title}>الاقتراحات</Text>
          <Text style={s.sub}>{suggestions.length} اقتراح مقدّم</Text>
        </View>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowForm(v => !v); }}
          style={[s.addBtn, { backgroundColor: showForm ? theme.error : theme.primary }]}>
          <MaterialIcons name={showForm ? 'close' : 'add'} size={20} color="#FFF" />
        </Pressable>
      </View>

      {/* New Suggestion Form */}
      {showForm && (
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[s.formCard, { backgroundColor: theme.surface, borderColor: theme.primary + '40' }]}>
              <Text style={[s.formTitle, { color: theme.textPrimary }]}>اقتراح جديد</Text>

              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {SUGGESTION_CATEGORIES.slice(1).map(cat => (
                  <Pressable key={cat.id} style={[s.chip, category === cat.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => { setCategory(cat.id); Haptics.selectionAsync(); }}>
                    <MaterialIcons name={cat.icon as any} size={12} color={category === cat.id ? '#FFF' : theme.textSecondary} />
                    <Text style={[s.chipText, category === cat.id && { color: '#FFF' }]}>{cat.label}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput style={[s.input, { color: theme.textPrimary, borderColor: title.length > 0 ? theme.primary : theme.border }]}
                value={title} onChangeText={setTitle}
                placeholder="عنوان الاقتراح *" placeholderTextColor={theme.textMuted}
                textAlign="right" maxLength={100} />

              <TextInput style={[s.textarea, { color: theme.textPrimary, borderColor: description.length > 0 ? theme.primary : theme.border }]}
                value={description} onChangeText={setDescription}
                placeholder="اشرح اقتراحك بالتفصيل *" placeholderTextColor={theme.textMuted}
                multiline textAlign="right" textAlignVertical="top" maxLength={500} />

              <Pressable onPress={handleSubmit} disabled={submitting || !title.trim() || !description.trim()}
                style={[s.submitBtn, { backgroundColor: theme.primary, opacity: (submitting || !title.trim() || !description.trim()) ? 0.5 : 1 }]}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialIcons name="send" size={18} color="#FFF" />}
                <Text style={s.submitText}>إرسال الاقتراح</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {STATUS_FILTERS.map(f => {
          const statusInfo = SUGGESTION_STATUSES.find(s => s.id === f.id);
          const active = statusFilter === f.id;
          const color = statusInfo?.color || theme.primary;
          return (
            <Pressable key={f.id} style={[s.filterChip, active && { backgroundColor: color, borderColor: color }]}
              onPress={() => { setStatusFilter(f.id); Haptics.selectionAsync(); }}>
              <Text style={[s.filterText, active && { color: '#FFF' }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
        >
          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <MaterialIcons name="lightbulb-outline" size={52} color={theme.textMuted} />
              <Text style={s.emptyTitle}>لا توجد اقتراحات</Text>
              <Text style={[s.emptySub, { color: theme.textMuted }]}>كن أول من يقترح ميزة جديدة!</Text>
            </View>
          ) : (
            filtered.map((sug, i) => (
              <Animated.View key={sug.id} entering={FadeInDown.duration(260).delay(i * 40)}>
                <SuggestionCard suggestion={sug} theme={theme}
                  onVote={() => handleVote(sug)}
                  isOwn={sug.user_id === user?.id} />
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
  formCard: { margin: 16, marginTop: 8, borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 12 },
  formTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', marginBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.background },
  chipText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  input: { backgroundColor: t.background, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Cairo_400Regular' },
  textarea: { backgroundColor: t.background, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Cairo_400Regular', minHeight: 90 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  submitText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
  filterText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', textAlign: 'center' },
});
