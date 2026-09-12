import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '@/template';
import {
  fetchMessages, sendMessage, fetchConversations, fetchUserProfile,
  markMessagesAsRead, getDisplayName, getDisplayInitials, Message, UserProfile,
} from '../../services/messagesService';

const POLLING_INTERVAL = 8000;

function MessageBubble({ msg, isOwn, theme, showAvatar, initials }: {
  msg: Message; isOwn: boolean; theme: any; showAvatar: boolean; initials: string;
}) {
  const time = new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  return (
    <Animated.View entering={FadeIn.duration(200)} style={[mb.wrapper, isOwn ? mb.ownWrapper : mb.otherWrapper]}>
      {!isOwn && (
        <View style={[mb.avatar, { backgroundColor: theme.primary, opacity: showAvatar ? 1 : 0 }]}>
          <Text style={mb.avatarText}>{initials.slice(0, 1)}</Text>
        </View>
      )}
      <View style={[
        mb.bubble,
        isOwn ? [mb.ownBubble, { backgroundColor: theme.primary }]
          : [mb.otherBubble, { backgroundColor: theme.surface, borderColor: theme.border }],
      ]}>
        <Text style={[mb.text, { color: isOwn ? '#FFF' : theme.textPrimary }]}>{msg.content}</Text>
        <View style={mb.timeRow}>
          <Text style={[mb.time, { color: isOwn ? 'rgba(255,255,255,0.7)' : theme.textMuted }]}>{time}</Text>
          {isOwn && <MaterialIcons name={msg.is_read ? 'done-all' : 'done'} size={12} color="rgba(255,255,255,0.7)" />}
        </View>
      </View>
    </Animated.View>
  );
}

const mb = StyleSheet.create({
  wrapper: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  ownWrapper: { flexDirection: 'row-reverse' },
  otherWrapper: {},
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', flexShrink: 0 },
  avatarText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  ownBubble: { borderBottomRightRadius: 4 },
  otherBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
  text: { fontSize: 15, fontFamily: 'Cairo_400Regular', lineHeight: 22 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end' },
  time: { fontSize: 9, fontFamily: 'Cairo_400Regular' },
});

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    const msgs = await fetchMessages(id);
    setMessages(msgs);
    if (user?.id) await markMessagesAsRead(id, user.id);
  }, [id, user?.id]);

  useEffect(() => {
    if (!id || !user?.id) return;

    // Load conversation info to find other participant
    fetchConversations(user.id).then(convs => {
      const conv = convs.find(c => c.id === id);
      if (conv) {
        const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
        fetchUserProfile(otherId).then(p => setOtherProfile(p));
      }
    });

    loadMessages().finally(() => setLoading(false));
    pollingRef.current = setInterval(loadMessages, POLLING_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [id, user?.id, loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !user?.id || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    setSending(true);

    const msg = await sendMessage(id, user.id, text);
    setSending(false);

    if (msg) {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, sending, user?.id, id]);

  const otherName = getDisplayName(otherProfile);
  const otherInitials = getDisplayInitials(otherProfile);

  // Group messages by date
  const grouped = useMemo(() => {
    const groups: { date: string; msgs: Message[] }[] = [];
    messages.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' });
      const last = groups[groups.length - 1];
      if (last && last.date === date) last.msgs.push(msg);
      else groups.push({ date, msgs: [msg] });
    });
    return groups;
  }, [messages]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={[cs.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable onPress={() => router.back()} style={[cs.backBtn, { borderColor: theme.border }]}>
          <MaterialIcons name="arrow-forward" size={20} color={theme.textPrimary} />
        </Pressable>
        <LinearGradient colors={[theme.primary, theme.primaryDark]} style={cs.avatar}>
          <Text style={cs.avatarText}>{otherInitials.slice(0, 1)}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[cs.name, { color: theme.textPrimary }]}>{otherName}</Text>
          <Text style={[cs.status, { color: '#22C55E' }]}>• متصل</Text>
        </View>
        <Pressable style={cs.menuBtn} hitSlop={10}>
          <MaterialIcons name="more-vert" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {grouped.map((group, gi) => (
              <View key={gi}>
                <View style={cs.dateSep}>
                  <View style={[cs.dateLine, { backgroundColor: theme.border }]} />
                  <Text style={[cs.dateText, { color: theme.textMuted, backgroundColor: theme.background }]}>{group.date}</Text>
                  <View style={[cs.dateLine, { backgroundColor: theme.border }]} />
                </View>
                {group.msgs.map((msg, i) => {
                  const isOwn = msg.sender_id === user?.id;
                  const nextMsg = group.msgs[i + 1];
                  const showAvatar = !nextMsg || nextMsg.sender_id !== msg.sender_id;
                  return (
                    <MessageBubble key={msg.id} msg={msg} isOwn={isOwn} theme={theme} showAvatar={showAvatar} initials={otherInitials} />
                  );
                })}
              </View>
            ))}
            {messages.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
                <MaterialIcons name="chat-bubble-outline" size={52} color={theme.textMuted} />
                <Text style={{ fontFamily: 'Cairo_600SemiBold', color: theme.textPrimary, fontSize: 16 }}>ابدأ المحادثة</Text>
                <Text style={{ fontFamily: 'Cairo_400Regular', color: theme.textMuted, fontSize: 13 }}>أرسل رسالتك الأولى</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input */}
        <View style={[cs.inputArea, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TextInput style={[cs.input, { color: theme.textPrimary, backgroundColor: theme.background, borderColor: theme.border }]}
            value={input} onChangeText={setInput}
            placeholder="اكتب رسالة..." placeholderTextColor={theme.textMuted}
            multiline textAlign="right" maxLength={2000} />
          <Pressable onPress={handleSend} disabled={!input.trim() || sending}
            style={[cs.sendBtn, { backgroundColor: theme.primary, opacity: !input.trim() || sending ? 0.5 : 1 }]}>
            {sending ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialIcons name="send" size={20} color="#FFF" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  name: { fontSize: 15, fontFamily: 'Cairo_700Bold' },
  status: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  menuBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  dateSep: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginVertical: 12, gap: 8 },
  dateLine: { flex: 1, height: 1 },
  dateText: { fontSize: 11, fontFamily: 'Cairo_500Medium', paddingHorizontal: 8 },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: 'Cairo_400Regular', maxHeight: 100, writingDirection: 'rtl' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
