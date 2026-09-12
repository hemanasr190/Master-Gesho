import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth, useAlert } from '@/template';
import {
  fetchConversations, createOrGetConversation, fetchUserProfile,
  getDisplayName, getDisplayInitials, Conversation, UserProfile,
} from '../services/messagesService';

const POLLING_INTERVAL = 15000;

function ConversationItem({
  conv, userId, otherProfile, theme, onPress,
}: {
  conv: Conversation; userId: string; otherProfile: UserProfile | null; theme: any; onPress: () => void;
}) {
  const isP1 = conv.participant_1 === userId;
  const unread = isP1 ? conv.unread_count_1 : conv.unread_count_2;
  const initials = getDisplayInitials(otherProfile);
  const name = getDisplayName(otherProfile);
  const time = conv.last_message_at
    ? new Date(conv.last_message_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    : '';
  const date = conv.last_message_at
    ? new Date(conv.last_message_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
    : '';

  const isToday = conv.last_message_at
    ? new Date(conv.last_message_at).toDateString() === new Date().toDateString()
    : false;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ci.row, { backgroundColor: pressed ? theme.backgroundSecondary : theme.background }]}>
      <LinearGradient colors={[theme.primary, theme.primaryDark]} style={ci.avatar}>
        <Text style={ci.avatarText}>{initials}</Text>
      </LinearGradient>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={[ci.name, { color: theme.textPrimary }]} numberOfLines={1}>{name}</Text>
          <Text style={[ci.time, { color: theme.textMuted }]}>{isToday ? time : date}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[ci.lastMsg, { color: theme.textSecondary }]} numberOfLines={1}>
            {conv.last_message || 'بدأ المحادثة'}
          </Text>
          {unread > 0 && (
            <View style={[ci.unreadBadge, { backgroundColor: theme.primary }]}>
              <Text style={ci.unreadText}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const ci = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  name: { fontSize: 15, fontFamily: 'Cairo_700Bold', flex: 1 },
  time: { fontSize: 11, fontFamily: 'Cairo_400Regular', flexShrink: 0 },
  lastMsg: { fontSize: 13, fontFamily: 'Cairo_400Regular', flex: 1 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  unreadText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});

// New conversation modal
function NewConvModal({
  visible, onClose, onStart, theme,
}: { visible: boolean; onClose: () => void; onStart: (email: string) => void; theme: any }) {
  const [email, setEmail] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={nm.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <Animated.View entering={FadeInDown.springify().damping(20)} style={[nm.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
            <View style={nm.handle} />
            <Text style={[nm.title, { color: theme.textPrimary }]}>محادثة جديدة</Text>
            <Text style={[nm.sub, { color: theme.textMuted }]}>أدخل بريد المستخدم لبدء المحادثة</Text>
            <View style={[nm.input, { borderColor: email.length > 0 ? theme.primary : theme.border }]}>
              <MaterialIcons name="email" size={18} color={theme.textMuted} />
              <TextInput style={[nm.inputText, { color: theme.textPrimary }]}
                value={email} onChangeText={setEmail}
                placeholder="البريد الإلكتروني..."
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address" autoCapitalize="none"
                textAlign="right" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={onClose} style={[nm.btn, { backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[nm.btnText, { color: theme.textSecondary }]}>إلغاء</Text>
              </Pressable>
              <Pressable onPress={() => { if (email.trim()) { onStart(email.trim()); onClose(); setEmail(''); } }}
                disabled={!email.trim()}
                style={[nm.btn, { flex: 2, backgroundColor: theme.primary, opacity: email.trim() ? 1 : 0.5 }]}>
                <Text style={[nm.btnText, { color: '#FFF' }]}>بدء المحادثة</Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const nm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 10, gap: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontFamily: 'Cairo_700Bold', textAlign: 'center' },
  sub: { fontSize: 13, fontFamily: 'Cairo_400Regular', textAlign: 'center' },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12 },
  inputText: { flex: 1, fontSize: 15, fontFamily: 'Cairo_400Regular', writingDirection: 'rtl' },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold' },
});

export default function MessagesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    const convs = await fetchConversations(user.id);
    setConversations(convs);

    // Load other participant profiles
    const othersIds = convs.map(c => c.participant_1 === user.id ? c.participant_2 : c.participant_1);
    const uniqueIds = [...new Set(othersIds)];
    const profileMap: Record<string, UserProfile | null> = { ...profiles };
    await Promise.all(uniqueIds.filter(id => !profileMap[id]).map(async id => {
      profileMap[id] = await fetchUserProfile(id);
    }));
    setProfiles(profileMap);
  }, [user?.id]);

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
    pollingRef.current = setInterval(loadConversations, POLLING_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [loadConversations]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const handleStartConversation = useCallback(async (email: string) => {
    if (!user?.id) return;
    showAlert('ملاحظة', 'هذه الميزة تتطلب البحث بالبريد الإلكتروني. سيتم تفعيلها قريباً.');
  }, [user?.id, showAlert]);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c => {
      const otherId = c.participant_1 === user?.id ? c.participant_2 : c.participant_1;
      const profile = profiles[otherId];
      const name = getDisplayName(profile).toLowerCase();
      return name.includes(q) || c.last_message.toLowerCase().includes(q);
    });
  }, [conversations, search, user?.id, profiles]);

  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <NewConvModal visible={showNewModal} onClose={() => setShowNewModal(false)} onStart={handleStartConversation} theme={theme} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={s.title}>الرسائل</Text>
          <Text style={s.sub}>{conversations.length} محادثة</Text>
        </View>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowNewModal(true); }}
          style={[s.newBtn, { backgroundColor: theme.primary }]}>
          <MaterialIcons name="edit" size={18} color="#FFF" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={[s.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialIcons name="search" size={18} color={theme.textMuted} />
          <TextInput style={[s.searchInput, { color: theme.textPrimary }]}
            value={search} onChangeText={setSearch}
            placeholder="ابحث في الرسائل..."
            placeholderTextColor={theme.textMuted}
            textAlign="right" />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <MaterialIcons name="close" size={16} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.emptyBox}>
          <View style={s.emptyIcon}><MaterialIcons name="chat-bubble-outline" size={48} color={theme.textMuted} /></View>
          <Text style={s.emptyTitle}>لا توجد محادثات</Text>
          <Text style={s.emptySub}>ابدأ محادثة جديدة مع مستخدم آخر</Text>
          <Pressable onPress={() => setShowNewModal(true)} style={[s.startBtn, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="edit" size={16} color="#FFF" />
            <Text style={s.startBtnText}>محادثة جديدة</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        >
          {filtered.map((conv, i) => {
            const otherId = conv.participant_1 === user?.id ? conv.participant_2 : conv.participant_1;
            const profile = profiles[otherId] || null;
            return (
              <Animated.View key={conv.id} entering={FadeInDown.duration(260).delay(i * 40)}>
                <ConversationItem
                  conv={conv} userId={user?.id || ''} otherProfile={profile} theme={theme}
                  onPress={() => { Haptics.selectionAsync(); router.push(`/conversation/${conv.id}` as any); }}
                />
                <View style={[s.divider, { backgroundColor: theme.border }]} />
              </Animated.View>
            );
          })}
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
  newBtn: { marginLeft: 'auto', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { padding: 16, paddingBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', height: 22, writingDirection: 'rtl' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontFamily: 'Cairo_600SemiBold', color: t.textPrimary },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: t.textMuted, textAlign: 'center' },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  startBtnText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: '#FFF' },
  divider: { height: 1, marginLeft: 78 },
});
