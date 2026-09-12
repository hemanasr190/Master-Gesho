import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Clipboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth, useAlert } from '@/template';
import { generateAIChat, generateAIImage, ChatMessage } from '../services/aiService';

type StudioTab = 'image' | 'chat' | 'code' | 'prompts';

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1' }, { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' }, { value: '4:3', label: '4:3' },
];

const IMAGE_STYLES = [
  { id: 'realistic', label: 'واقعي', suffix: ', photorealistic, high quality, 8K' },
  { id: 'artistic', label: 'فني', suffix: ', artistic painting, vibrant colors' },
  { id: 'anime', label: 'أنيمي', suffix: ', anime style, Japanese animation' },
  { id: '3d', label: 'ثلاثي الأبعاد', suffix: ', 3D render, studio lighting, professional' },
  { id: 'minimal', label: 'بسيط', suffix: ', minimalist, flat design, clean' },
];

const IMAGE_MODELS = [
  { id: 'google/gemini-2.0-flash-exp', label: 'Gemini Flash' },
  { id: 'google/gemini-2.5-flash-preview', label: 'Gemini Pro' },
  { id: 'openai/gpt-image-1', label: 'GPT Image' },
];

const CHAT_MODELS = [
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
];

const CODE_ACTIONS = [
  { id: 'explain', label: 'شرح', icon: 'description', prompt: 'اشرح هذا الكود بالتفصيل باللغة العربية:\n\n' },
  { id: 'fix', label: 'إصلاح', icon: 'bug-report', prompt: 'ابحث عن الأخطاء وأصلحها في هذا الكود:\n\n' },
  { id: 'optimize', label: 'تحسين', icon: 'speed', prompt: 'حسّن هذا الكود لأفضل أداء وقابلية للصيانة:\n\n' },
  { id: 'document', label: 'توثيق', icon: 'notes', prompt: 'أضف توثيقاً شاملاً لهذا الكود:\n\n' },
];

const QUICK_PROMPTS = [
  'صورة غروب الشمس على البحر بألوان دافئة',
  'مدينة مستقبلية عصرية تحت المطر ليلاً',
  'قهوة بجانب كتاب على طاولة خشبية',
  'طائر فينيق يحلق في السماء',
  'منظر طبيعي لجبال ثلجية مع بحيرة',
];

function TabBar({ activeTab, onTabChange, theme }: { activeTab: StudioTab; onTabChange: (t: StudioTab) => void; theme: any }) {
  const tabs: { id: StudioTab; label: string; icon: string; color: string }[] = [
    { id: 'image', label: 'صورة', icon: 'image', color: '#8B5CF6' },
    { id: 'chat', label: 'محادثة', icon: 'chat', color: '#3B82F6' },
    { id: 'code', label: 'كود', icon: 'code', color: '#10B981' },
    { id: 'prompts', label: 'بروبمت', icon: 'library-books', color: '#F59E0B' },
  ];
  return (
    <View style={[tb.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      {tabs.map(tab => {
        const active = activeTab === tab.id;
        return (
          <Pressable key={tab.id} style={[tb.tab, active && { borderBottomColor: tab.color, borderBottomWidth: 2.5 }]}
            onPress={() => { Haptics.selectionAsync(); onTabChange(tab.id); }}>
            <MaterialIcons name={tab.icon as any} size={20} color={active ? tab.color : theme.textMuted} />
            <Text style={[tb.label, { color: active ? tab.color : theme.textMuted, fontFamily: active ? 'Cairo_700Bold' : 'Cairo_500Medium' }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const tb = StyleSheet.create({
  container: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 10, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  label: { fontSize: 11 },
});

// ── Image Tab ──────────────────────────────────────────────────────────────────
function ImageTab({ theme }: { theme: any }) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [prompt, setPrompt] = useState('');
  const [selectedAspect, setSelectedAspect] = useState('1:1');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const s = useMemo(() => imgStyles(theme), [theme]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) { showAlert('أدخل وصفاً للصورة'); return; }
    if (!user) { showAlert('يجب تسجيل الدخول لتوليد الصور'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setGeneratedImage(null);

    const styleObj = IMAGE_STYLES.find(s => s.id === selectedStyle);
    const fullPrompt = prompt.trim() + (styleObj?.suffix || '');

    const { imageUrl, error } = await generateAIImage(fullPrompt, selectedAspect, selectedModel);
    setLoading(false);

    if (error || !imageUrl) {
      showAlert('حدث خطأ', error || 'فشل في توليد الصورة');
      return;
    }

    setGeneratedImage(imageUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [prompt, selectedAspect, selectedStyle, selectedModel, user, showAlert]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Quick prompts */}
      <Animated.View entering={FadeInDown.duration(300)}>
        <Text style={s.label}>أفكار سريعة</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {QUICK_PROMPTS.map((p, i) => (
            <Pressable key={i} style={[s.quickChip, { borderColor: theme.primary + '40' }]}
              onPress={() => { setPrompt(p); Haptics.selectionAsync(); }}>
              <Text style={[s.quickChipText, { color: theme.primary }]}>{p.slice(0, 25)}...</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Prompt input */}
      <Animated.View entering={FadeInDown.duration(300).delay(60)}>
        <Text style={s.label}>وصف الصورة</Text>
        <View style={[s.promptBox, { borderColor: prompt.length > 0 ? theme.primary : theme.border }]}>
          <TextInput style={[s.promptInput, { color: theme.textPrimary }]}
            value={prompt} onChangeText={setPrompt}
            placeholder="صف الصورة التي تريد إنشاءها..."
            placeholderTextColor={theme.textMuted}
            multiline textAlign="right" textAlignVertical="top" />
          {prompt.length > 0 && (
            <Pressable onPress={() => setPrompt('')} style={s.clearBtn} hitSlop={8}>
              <MaterialIcons name="close" size={14} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
        <Text style={[s.charCount, { color: theme.textMuted }]}>{prompt.length} حرف</Text>
      </Animated.View>

      {/* Style */}
      <Animated.View entering={FadeInDown.duration(300).delay(90)}>
        <Text style={s.label}>الأسلوب</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {IMAGE_STYLES.map(st => (
            <Pressable key={st.id}
              style={[s.styleChip, selectedStyle === st.id && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}
              onPress={() => { setSelectedStyle(st.id); Haptics.selectionAsync(); }}>
              <Text style={[s.styleChipText, selectedStyle === st.id && { color: '#FFF' }]}>{st.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Aspect ratio */}
      <Animated.View entering={FadeInDown.duration(300).delay(120)}>
        <Text style={s.label}>نسبة الأبعاد</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {ASPECT_RATIOS.map(ar => (
            <Pressable key={ar.value} style={[s.aspectBtn, selectedAspect === ar.value && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}
              onPress={() => { setSelectedAspect(ar.value); Haptics.selectionAsync(); }}>
              <Text style={[s.aspectText, selectedAspect === ar.value && { color: '#FFF' }]}>{ar.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Model */}
      <Animated.View entering={FadeInDown.duration(300).delay(150)}>
        <Text style={s.label}>النموذج</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {IMAGE_MODELS.map(m => (
            <Pressable key={m.id} style={[s.modelChip, selectedModel === m.id && { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
              onPress={() => { setSelectedModel(m.id); Haptics.selectionAsync(); }}>
              <Text style={[s.modelText, selectedModel === m.id && { color: theme.primary }]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Generate button */}
      <Pressable onPress={handleGenerate} disabled={loading || !prompt.trim()} style={[s.generateBtn, (!prompt.trim() || loading) && { opacity: 0.5 }]}>
        <LinearGradient colors={['#8B5CF6', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.generateGrad}>
          {loading
            ? <><ActivityIndicator color="#FFF" size="small" /><Text style={s.generateText}>جارٍ التوليد...</Text></>
            : <><MaterialIcons name="auto-awesome" size={20} color="#FFF" /><Text style={s.generateText}>إنشاء الصورة</Text></>
          }
        </LinearGradient>
      </Pressable>

      {/* Result */}
      {generatedImage && (
        <Animated.View entering={ZoomIn.springify().damping(14)} style={s.resultCard}>
          <Text style={[s.label, { marginBottom: 10 }]}>الصورة المولّدة</Text>
          <Image source={{ uri: generatedImage }} style={[s.resultImage, { aspectRatio: selectedAspect === '16:9' ? 16 / 9 : selectedAspect === '9:16' ? 9 / 16 : 1 }]} contentFit="contain" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable style={[s.actionBtn, { flex: 1, backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => { Haptics.selectionAsync(); setPrompt(''); setGeneratedImage(null); }}>
              <MaterialIcons name="refresh" size={18} color={theme.textSecondary} />
              <Text style={[s.actionBtnText, { color: theme.textSecondary }]}>إعادة</Text>
            </Pressable>
            <Pressable style={[s.actionBtn, { flex: 1, backgroundColor: '#8B5CF620', borderColor: '#8B5CF640' }]}
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); showAlert('تم الحفظ', 'الصورة محفوظة في مكتبة الصور المولّدة'); }}>
              <MaterialIcons name="save" size={18} color="#8B5CF6" />
              <Text style={[s.actionBtnText, { color: '#8B5CF6' }]}>حفظ</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const imgStyles = (t: any) => StyleSheet.create({
  label: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary, marginBottom: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999, borderWidth: 1, backgroundColor: t.surface },
  quickChipText: { fontSize: 12, fontFamily: 'Cairo_500Medium' },
  promptBox: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, minHeight: 90 },
  promptInput: { flex: 1, fontSize: 15, fontFamily: 'Cairo_400Regular', lineHeight: 26, writingDirection: 'rtl' },
  clearBtn: { position: 'absolute', top: 10, left: 10 },
  charCount: { fontSize: 10, fontFamily: 'Cairo_400Regular', textAlign: 'left', marginTop: 4 },
  styleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
  styleChipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  aspectBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: t.border, alignItems: 'center', backgroundColor: t.surface },
  aspectText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  modelChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
  modelText: { fontSize: 12, fontFamily: 'Cairo_500Medium', color: t.textSecondary },
  generateBtn: { borderRadius: 14, overflow: 'hidden' },
  generateGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  generateText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  resultCard: { backgroundColor: t.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border },
  resultImage: { width: '100%', borderRadius: 12, backgroundColor: t.backgroundSecondary },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
});

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab({ theme }: { theme: any }) {
  const { showAlert } = useAlert();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'أنت مساعد ذكاء اصطناعي متخصص يتحدث العربية. كن ودوداً ومفيداً وموجزاً في إجاباتك.' },
    { role: 'assistant', content: 'مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟ 😊' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(CHAT_MODELS[0].id);
  const scrollRef = useRef<ScrollView>(null);
  const s = useMemo(() => chatStyles(theme), [theme]);

  const displayMessages = messages.filter(m => m.role !== 'system');

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    const updated: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const { text: reply, error } = await generateAIChat(updated, selectedModel);
    setLoading(false);
    if (error) {
      showAlert('خطأ في AI', error);
      return;
    }
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [input, loading, messages, selectedModel, showAlert]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={120}>
      {/* Model selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.modelRow}>
        {CHAT_MODELS.map(m => (
          <Pressable key={m.id} style={[s.modelChip, selectedModel === m.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => { setSelectedModel(m.id); Haptics.selectionAsync(); }}>
            <Text style={[s.modelText, selectedModel === m.id && { color: '#FFF' }]}>{m.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.msgList} showsVerticalScrollIndicator={false}>
        {displayMessages.map((msg, i) => (
          <Animated.View key={i} entering={FadeInDown.duration(280).delay(i < 2 ? 0 : 0)}
            style={[s.bubble, msg.role === 'user' ? s.userBubble : s.aiBubble]}>
            {msg.role === 'assistant' && (
              <View style={s.aiAvatar}>
                <MaterialIcons name="auto-awesome" size={14} color="#FFF" />
              </View>
            )}
            <View style={[s.bubbleContent, msg.role === 'user' ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
              <Text style={[s.bubbleText, { color: msg.role === 'user' ? '#FFF' : theme.textPrimary }]}>{msg.content}</Text>
            </View>
          </Animated.View>
        ))}
        {loading && (
          <View style={[s.bubble, s.aiBubble]}>
            <View style={s.aiAvatar}><MaterialIcons name="auto-awesome" size={14} color="#FFF" /></View>
            <View style={[s.bubbleContent, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[0, 1, 2].map(i => <View key={i} style={[s.typingDot, { backgroundColor: theme.primary }]} />)}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Actions row */}
      <View style={s.actionsRow}>
        <Pressable style={s.clearChat} onPress={() => { setMessages(prev => prev.slice(0, 1)); Haptics.selectionAsync(); }}>
          <MaterialIcons name="delete-sweep" size={18} color={theme.textMuted} />
        </Pressable>
        <Pressable style={s.clearChat} onPress={() => { if (displayMessages.length > 0) { const last = displayMessages[displayMessages.length - 1]; if (last.role === 'assistant') { Clipboard.setString(last.content); Haptics.selectionAsync(); } } }}>
          <MaterialIcons name="content-copy" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      {/* Input */}
      <View style={[s.inputRow, { borderTopColor: theme.border }]}>
        <TextInput style={[s.input, { color: theme.textPrimary, backgroundColor: theme.surface, borderColor: theme.border }]}
          value={input} onChangeText={setInput}
          placeholder="اكتب رسالتك..."
          placeholderTextColor={theme.textMuted}
          multiline textAlign="right"
          onSubmitEditing={handleSend} />
        <Pressable onPress={handleSend} disabled={!input.trim() || loading}
          style={[s.sendBtn, { backgroundColor: theme.primary, opacity: !input.trim() || loading ? 0.5 : 1 }]}>
          <MaterialIcons name="send" size={20} color="#FFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const chatStyles = (t: any) => StyleSheet.create({
  modelRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  modelChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  modelText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  msgList: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  bubble: { flexDirection: 'row', gap: 8, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  aiBubble: { alignSelf: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4, flexShrink: 0 },
  bubbleContent: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, flexShrink: 1 },
  bubbleText: { fontSize: 15, fontFamily: 'Cairo_400Regular', lineHeight: 24 },
  typingDot: { width: 8, height: 8, borderRadius: 4 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  clearChat: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: 'Cairo_400Regular', maxHeight: 90, writingDirection: 'rtl' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

// ── Code Tab ──────────────────────────────────────────────────────────────────
function CodeTab({ theme }: { theme: any }) {
  const { showAlert } = useAlert();
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState('explain');
  const s = useMemo(() => codeStyles(theme), [theme]);

  const handleAction = useCallback(async () => {
    if (!code.trim()) { showAlert('أدخل الكود أولاً'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setOutput('');
    const action = CODE_ACTIONS.find(a => a.id === selectedAction);
    const prompt = (action?.prompt || '') + code;
    const { text, error } = await generateAIChat([
      { role: 'system', content: 'أنت خبير برمجة متخصص. أجب باللغة العربية واستخدم الكود المنسق عند الحاجة.' },
      { role: 'user', content: prompt },
    ]);
    setLoading(false);
    if (error) { showAlert('خطأ', error); return; }
    setOutput(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [code, selectedAction, showAlert]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {CODE_ACTIONS.map(action => (
          <Pressable key={action.id}
            style={[s.actionChip, selectedAction === action.id && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
            onPress={() => { setSelectedAction(action.id); Haptics.selectionAsync(); }}>
            <MaterialIcons name={action.icon as any} size={14} color={selectedAction === action.id ? '#FFF' : theme.textSecondary} />
            <Text style={[s.actionChipText, selectedAction === action.id && { color: '#FFF' }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View>
        <Text style={s.label}>الكود</Text>
        <View style={[s.codeBox, { borderColor: code.length > 0 ? '#10B981' : theme.border }]}>
          <TextInput style={[s.codeInput, { color: theme.textPrimary }]}
            value={code} onChangeText={setCode}
            placeholder="الصق كودك هنا..."
            placeholderTextColor={theme.textMuted}
            multiline textAlign="left" textAlignVertical="top"
            autoCapitalize="none" autoCorrect={false}
            fontFamily="monospace" />
        </View>
      </View>

      <Pressable onPress={handleAction} disabled={loading || !code.trim()} style={[s.runBtn, (!code.trim() || loading) && { opacity: 0.5 }]}>
        <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.runGrad}>
          {loading ? <><ActivityIndicator color="#FFF" size="small" /><Text style={s.runText}>معالجة...</Text></>
            : <><MaterialIcons name="play-arrow" size={20} color="#FFF" /><Text style={s.runText}>{CODE_ACTIONS.find(a => a.id === selectedAction)?.label}</Text></>}
        </LinearGradient>
      </Pressable>

      {output.length > 0 && (
        <Animated.View entering={FadeInDown.duration(300)} style={[s.outputBox, { borderColor: '#10B98140' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={[s.label, { marginBottom: 0 }]}>النتيجة</Text>
            <Pressable onPress={() => { Clipboard.setString(output); Haptics.selectionAsync(); }} style={s.copyBtn}>
              <MaterialIcons name="content-copy" size={14} color="#10B981" />
              <Text style={s.copyBtnText}>نسخ</Text>
            </Pressable>
          </View>
          <Text style={[s.outputText, { color: theme.textPrimary }]}>{output}</Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const codeStyles = (t: any) => StyleSheet.create({
  label: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary, marginBottom: 8 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
  actionChipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  codeBox: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5, minHeight: 150 },
  codeInput: { fontSize: 14, lineHeight: 22, padding: 14, minHeight: 150 },
  runBtn: { borderRadius: 12, overflow: 'hidden' },
  runGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  runText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  outputBox: { backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1 },
  outputText: { fontSize: 14, fontFamily: 'Cairo_400Regular', lineHeight: 22 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999, backgroundColor: '#10B98115' },
  copyBtnText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#10B981' },
});

// ── Prompts Quick Tab ─────────────────────────────────────────────────────────
function PromptsTab({ theme, router }: { theme: any; router: any }) {
  const FEATURED = [
    { title: 'كاتب محتوى عربي', category: 'كتابة', icon: 'edit', color: '#8B5CF6', desc: 'ينشئ محتوى عربي احترافي وجذاب' },
    { title: 'محلل بيانات', category: 'تحليل', icon: 'analytics', color: '#3B82F6', desc: 'يحلل البيانات ويستخلص رؤى قيّمة' },
    { title: 'مساعد كود', category: 'برمجة', icon: 'code', color: '#10B981', desc: 'يشرح ويصحح ويحسن الأكواد' },
    { title: 'مترجم محترف', category: 'ترجمة', icon: 'translate', color: '#F59E0B', desc: 'يترجم بدقة مع مراعاة السياق' },
    { title: 'مسوّق رقمي', category: 'تسويق', icon: 'campaign', color: '#EC4899', desc: 'يكتب نصوصاً تسويقية مقنعة' },
    { title: 'مدرس متخصص', category: 'تعليم', icon: 'school', color: '#F97316', desc: 'يشرح المفاهيم بطريقة مبسطة' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontFamily: 'Cairo_700Bold', color: theme.textPrimary }}>مكتبة البروبمت</Text>
        <Pressable onPress={() => { Haptics.selectionAsync(); router.push('/prompt-center'); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: theme.primary }}>عرض الكل</Text>
          <MaterialIcons name="arrow-back" size={14} color={theme.primary} />
        </Pressable>
      </View>

      {FEATURED.map((p, i) => (
        <Animated.View key={i} entering={FadeInDown.duration(280).delay(i * 50)}>
          <Pressable style={[pt.card, { backgroundColor: theme.surface, borderColor: p.color + '30' }]}
            onPress={() => { Haptics.selectionAsync(); router.push('/prompt-center'); }}>
            <View style={[pt.icon, { backgroundColor: p.color + '20' }]}>
              <MaterialIcons name={p.icon as any} size={24} color={p.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={[pt.title, { color: theme.textPrimary }]}>{p.title}</Text>
                <View style={[pt.catBadge, { backgroundColor: p.color + '15' }]}>
                  <Text style={[pt.catText, { color: p.color }]}>{p.category}</Text>
                </View>
              </View>
              <Text style={[pt.desc, { color: theme.textSecondary }]}>{p.desc}</Text>
            </View>
            <MaterialIcons name="arrow-back" size={18} color={theme.textMuted} />
          </Pressable>
        </Animated.View>
      ))}

      <Pressable onPress={() => { Haptics.selectionAsync(); router.push('/prompt-center'); }}
        style={[pt.allBtn, { borderColor: theme.primary + '40', backgroundColor: theme.primary + '10' }]}>
        <MaterialIcons name="library-books" size={18} color={theme.primary} />
        <Text style={[pt.allBtnText, { color: theme.primary }]}>استعرض جميع البروبمتات</Text>
      </Pressable>
    </ScrollView>
  );
}

const pt = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: 15, fontFamily: 'Cairo_700Bold' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  catText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  desc: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
  allBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginTop: 4 },
  allBtnText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function AIStudioScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<StudioTab>('image');

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={[hs.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={[hs.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={[hs.title, { color: theme.textPrimary }]}>استوديو الذكاء الاصطناعي</Text>
          <Text style={[hs.subtitle, { color: theme.textMuted }]}>إنشاء صور · محادثة · كود · بروبمت</Text>
        </View>
        <View style={[hs.aiBadge, { backgroundColor: '#8B5CF6' }]}>
          <MaterialIcons name="auto-awesome" size={12} color="#FFF" />
          <Text style={hs.aiBadgeText}>AI</Text>
        </View>
      </View>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} theme={theme} />

      <View style={{ flex: 1 }}>
        {activeTab === 'image' && <ImageTab theme={theme} />}
        {activeTab === 'chat' && <ChatTab theme={theme} />}
        {activeTab === 'code' && <CodeTab theme={theme} />}
        {activeTab === 'prompts' && <PromptsTab theme={theme} router={router} />}
      </View>
    </SafeAreaView>
  );
}

const hs = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: 'Cairo_700Bold' },
  subtitle: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 1 },
  aiBadge: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999 },
  aiBadgeText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
