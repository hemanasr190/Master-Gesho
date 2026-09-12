import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth, useAlert } from '@/template';
import { createTicket, fetchUserTickets, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, SupportTicket } from '../services/supportService';

const FAQ_DATA = [
  {
    category: 'الحساب والتسجيل',
    icon: 'person',
    color: '#3B82F6',
    items: [
      { q: 'كيف أنشئ حساباً جديداً؟', a: 'انقر على "تسجيل الدخول" ثم اختر "حساب جديد". أدخل بريدك الإلكتروني وكلمة المرور، وسيُرسَل إليك رمز OTP للتحقق.' },
      { q: 'نسيت كلمة المرور، ماذا أفعل؟', a: 'انقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول. سيتم إرسال رمز التحقق لبريدك الإلكتروني لإعادة تعيين كلمة المرور.' },
      { q: 'كيف أغير بيانات حسابي؟', a: 'اذهب إلى الملف الشخصي ← تعديل الملف الشخصي. يمكنك تغيير اسم المستخدم والصورة الشخصية.' },
    ],
  },
  {
    category: 'الأدوات والاكتشاف',
    icon: 'apps',
    color: '#10B981',
    items: [
      { q: 'كيف أحفظ أداة مفضلة؟', a: 'انقر على أيقونة الإشارة المرجعية (🔖) على بطاقة أي أداة أو في صفحة تفاصيلها. ستجد الأدوات المحفوظة في تبويب "المحفوظات".' },
      { q: 'كيف أقيّم أداة؟', a: 'ادخل على صفحة تفاصيل الأداة وانقر على النجوم في قسم "قيّم هذه الأداة". يمكنك إعطاء من 1 إلى 5 نجوم.' },
      { q: 'كيف أضيف أداة للمنصة؟', a: 'اذهب إلى الملف الشخصي ← "أضف أداتك". أكمل النموذج بكافة بيانات الأداة وأرسله للمراجعة. سيتم إشعارك بنتيجة المراجعة.' },
    ],
  },
  {
    category: 'الذكاء الاصطناعي',
    icon: 'auto-awesome',
    color: '#8B5CF6',
    items: [
      { q: 'ما هي نماذج الذكاء الاصطناعي المتاحة؟', a: 'يدعم الاستوديو نماذج Gemini 3 Flash/Pro وGPT-5.1 للنصوص، وGemini Flash Image وGPT Image 1.5 لتوليد الصور.' },
      { q: 'كم عدد الصور التي يمكنني توليدها يومياً؟', a: 'يختلف حسب خطة الاشتراك. الخطة المجانية: 5 صور يومياً، الخطة برو: 100 صورة شهرياً.' },
      { q: 'هل يمكنني استخدام الصور المولّدة تجارياً؟', a: 'نعم، الصور المولّدة عبر استوديونا مرخصة للاستخدام الشخصي والتجاري مع الإشارة للمصدر.' },
    ],
  },
  {
    category: 'المدفوعات والاشتراك',
    icon: 'payment',
    color: '#F59E0B',
    items: [
      { q: 'ما الفرق بين الخطة المجانية والمدفوعة؟', a: 'الخطة المجانية توفر وصولاً أساسياً. الخطة برو تتضمن توليد صور AI بشكل أكثر، رسائل AI أكثر، وبدون إعلانات وأولوية في الدعم.' },
      { q: 'كيف يمكنني إلغاء الاشتراك؟', a: 'اذهب لصفحة الاشتراكات ← "إدارة الاشتراك" وانقر على "إلغاء التجديد التلقائي".' },
    ],
  },
];

function FAQItem({ item, theme, isOpen, onToggle }: {
  item: { q: string; a: string }; theme: any; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <View style={[fi.container, { borderBottomColor: theme.border }]}>
      <Pressable onPress={onToggle} style={fi.question}>
        <Text style={[fi.qText, { color: theme.textPrimary }]}>{item.q}</Text>
        <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={22} color={theme.textMuted} />
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeInDown.duration(250)} style={[fi.answer, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[fi.aText, { color: theme.textSecondary }]}>{item.a}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const fi = StyleSheet.create({
  container: { borderBottomWidth: 1 },
  question: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4 },
  qText: { flex: 1, fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'right', lineHeight: 22 },
  answer: { borderRadius: 12, padding: 14, marginBottom: 10 },
  aText: { fontSize: 14, fontFamily: 'Cairo_400Regular', lineHeight: 24, textAlign: 'right' },
});

type View = 'faq' | 'tickets' | 'new-ticket';

export default function HelpCenterScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeView, setActiveView] = useState<View>('faq');
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);

  // New ticket form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  const filteredFAQ = useMemo(() => {
    if (!search.trim()) return FAQ_DATA;
    const q = search.toLowerCase();
    return FAQ_DATA.map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)),
    })).filter(cat => cat.items.length > 0);
  }, [search]);

  const toggleItem = useCallback((key: string) => {
    Haptics.selectionAsync();
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const loadTickets = useCallback(async () => {
    if (!user?.id || ticketsLoaded) return;
    const data = await fetchUserTickets(user.id);
    setTickets(data);
    setTicketsLoaded(true);
  }, [user?.id, ticketsLoaded]);

  const handleViewTickets = useCallback(() => {
    setActiveView('tickets');
    loadTickets();
  }, [loadTickets]);

  const handleSubmitTicket = useCallback(async () => {
    if (!title.trim() || !description.trim()) {
      showAlert('تأكد من ملء جميع الحقول المطلوبة');
      return;
    }
    if (!user?.id) { showAlert('يجب تسجيل الدخول'); return; }
    setSubmitting(true);
    const ticket = await createTicket(user.id, title.trim(), description.trim(), category, priority);
    setSubmitting(false);
    if (ticket) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTickets(prev => [ticket, ...prev]);
      setTitle(''); setDescription(''); setCategory('general'); setPriority('normal');
      setActiveView('tickets');
      setTicketsLoaded(true);
      showAlert('تم الإرسال', 'سيتم الرد على تذكرتك في أقرب وقت ممكن');
    } else {
      showAlert('خطأ', 'حدث خطأ في إرسال التذكرة');
    }
  }, [title, description, category, priority, user?.id, showAlert]);

  const s = useMemo(() => createStyles(theme), [theme]);

  const getTabs = () => [
    { id: 'faq' as View, label: 'الأسئلة الشائعة', icon: 'help-outline' },
    { id: 'tickets' as View, label: 'تذاكر الدعم', icon: 'confirmation-number' },
  ];

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={s.title}>مركز المساعدة</Text>
          <Text style={s.sub}>أسئلة شائعة وتذاكر الدعم</Text>
        </View>
        {activeView !== 'new-ticket' && (
          <Pressable onPress={() => setActiveView('new-ticket')} style={[s.newBtn, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="add" size={20} color="#FFF" />
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {getTabs().map(tab => (
          <Pressable key={tab.id} style={[s.tab, activeView === tab.id && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
            onPress={() => { Haptics.selectionAsync(); tab.id === 'tickets' ? handleViewTickets() : setActiveView(tab.id); }}>
            <MaterialIcons name={tab.icon as any} size={16} color={activeView === tab.id ? theme.primary : theme.textMuted} />
            <Text style={[s.tabText, { color: activeView === tab.id ? theme.primary : theme.textMuted, fontFamily: activeView === tab.id ? 'Cairo_700Bold' : 'Cairo_500Medium' }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* FAQ View */}
      {(activeView === 'faq') && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {/* Search */}
          <View style={[s.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="search" size={18} color={theme.textMuted} />
            <TextInput style={[s.searchInput, { color: theme.textPrimary }]}
              value={search} onChangeText={setSearch}
              placeholder="ابحث في الأسئلة..." placeholderTextColor={theme.textMuted}
              textAlign="right" />
            {search.length > 0 && <Pressable onPress={() => setSearch('')} hitSlop={8}><MaterialIcons name="close" size={16} color={theme.textMuted} /></Pressable>}
          </View>

          {filteredFAQ.map((cat, ci) => (
            <Animated.View key={cat.category} entering={FadeInDown.duration(280).delay(ci * 60)} style={[s.catCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[s.catHeader, { borderBottomColor: theme.border }]}>
                <View style={[s.catIconBg, { backgroundColor: cat.color + '20' }]}>
                  <MaterialIcons name={cat.icon as any} size={18} color={cat.color} />
                </View>
                <Text style={[s.catTitle, { color: theme.textPrimary }]}>{cat.category}</Text>
                <Text style={[s.catCount, { color: theme.textMuted }]}>{cat.items.length} سؤال</Text>
              </View>
              {cat.items.map((item, ii) => (
                <FAQItem key={`${ci}-${ii}`} item={item} theme={theme}
                  isOpen={openItems.has(`${ci}-${ii}`)}
                  onToggle={() => toggleItem(`${ci}-${ii}`)} />
              ))}
            </Animated.View>
          ))}

          {filteredFAQ.length === 0 && (
            <View style={s.emptyBox}>
              <MaterialIcons name="search-off" size={48} color={theme.textMuted} />
              <Text style={s.emptyTitle}>لا توجد نتائج</Text>
            </View>
          )}

          {/* Contact CTA */}
          <Pressable onPress={() => setActiveView('new-ticket')} style={[s.contactCTA, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
            <MaterialIcons name="support-agent" size={28} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.ctaTitle, { color: theme.textPrimary }]}>لم تجد إجابتك؟</Text>
              <Text style={[s.ctaSub, { color: theme.textMuted }]}>تواصل مع فريق الدعم مباشرة</Text>
            </View>
            <MaterialIcons name="arrow-back" size={20} color={theme.primary} />
          </Pressable>
        </ScrollView>
      )}

      {/* Tickets View */}
      {activeView === 'tickets' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => setActiveView('new-ticket')} style={[s.newTicketBtn, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="add-circle-outline" size={18} color="#FFF" />
            <Text style={s.newTicketText}>تذكرة دعم جديدة</Text>
          </Pressable>

          {tickets.length === 0 ? (
            <View style={s.emptyBox}>
              <MaterialIcons name="confirmation-number" size={52} color={theme.textMuted} />
              <Text style={s.emptyTitle}>لا توجد تذاكر دعم</Text>
              <Text style={[s.emptySub, { color: theme.textMuted }]}>أنشئ تذكرة للتواصل مع الدعم الفني</Text>
            </View>
          ) : (
            tickets.map((ticket, i) => {
              const status = TICKET_STATUSES.find(s => s.id === ticket.status) || TICKET_STATUSES[0];
              const cat = TICKET_CATEGORIES.find(c => c.id === ticket.category);
              const pri = TICKET_PRIORITIES.find(p => p.id === ticket.priority);
              return (
                <Animated.View key={ticket.id} entering={FadeInDown.duration(280).delay(i * 50)}
                  style={[s.ticketCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={[s.ticketTitle, { color: theme.textPrimary }]}>{ticket.title}</Text>
                    <View style={[s.statusBadge, { backgroundColor: status.color + '20' }]}>
                      <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                  <Text style={[s.ticketDesc, { color: theme.textSecondary }]} numberOfLines={2}>{ticket.description}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    {cat && (
                      <View style={[s.tagBadge, { backgroundColor: theme.backgroundSecondary }]}>
                        <MaterialIcons name={cat.icon as any} size={11} color={theme.textMuted} />
                        <Text style={[s.tagText, { color: theme.textMuted }]}>{cat.label}</Text>
                      </View>
                    )}
                    {pri && (
                      <View style={[s.tagBadge, { backgroundColor: pri.color + '15' }]}>
                        <Text style={[s.tagText, { color: pri.color }]}>{pri.label}</Text>
                      </View>
                    )}
                    <Text style={[s.tagText, { color: theme.textMuted, marginLeft: 'auto' }]}>
                      {new Date(ticket.created_at).toLocaleDateString('ar-EG')}
                    </Text>
                  </View>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* New Ticket View */}
      {activeView === 'new-ticket' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
            <Text style={[s.formTitle, { color: theme.textPrimary }]}>تذكرة دعم جديدة</Text>

            <View>
              <Text style={s.label}>الفئة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {TICKET_CATEGORIES.map(cat => (
                  <Pressable key={cat.id} style={[s.chip, category === cat.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => { setCategory(cat.id); Haptics.selectionAsync(); }}>
                    <MaterialIcons name={cat.icon as any} size={13} color={category === cat.id ? '#FFF' : theme.textSecondary} />
                    <Text style={[s.chipText, category === cat.id && { color: '#FFF' }]}>{cat.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text style={s.label}>الأولوية</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {TICKET_PRIORITIES.map(p => (
                  <Pressable key={p.id} style={[s.chip, priority === p.id && { backgroundColor: p.color, borderColor: p.color }]}
                    onPress={() => { setPriority(p.id); Haptics.selectionAsync(); }}>
                    <Text style={[s.chipText, priority === p.id && { color: '#FFF' }]}>{p.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text style={s.label}>عنوان المشكلة *</Text>
              <TextInput style={[s.input, { color: theme.textPrimary, borderColor: title.length > 0 ? theme.primary : theme.border }]}
                value={title} onChangeText={setTitle}
                placeholder="وصف مختصر للمشكلة..." placeholderTextColor={theme.textMuted}
                textAlign="right" />
            </View>

            <View>
              <Text style={s.label}>التفاصيل *</Text>
              <TextInput style={[s.textarea, { color: theme.textPrimary, borderColor: description.length > 0 ? theme.primary : theme.border }]}
                value={description} onChangeText={setDescription}
                placeholder="اشرح المشكلة بالتفصيل..." placeholderTextColor={theme.textMuted}
                multiline textAlign="right" textAlignVertical="top" />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setActiveView('faq')} style={[s.cancelBtn, { borderColor: theme.border }]}>
                <Text style={[s.cancelText, { color: theme.textSecondary }]}>إلغاء</Text>
              </Pressable>
              <Pressable onPress={handleSubmitTicket} disabled={submitting || !title.trim() || !description.trim()}
                style={[s.submitBtn, { backgroundColor: theme.primary, opacity: (submitting || !title.trim() || !description.trim()) ? 0.5 : 1 }]}>
                {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialIcons name="send" size={18} color="#FFF" />}
                <Text style={s.submitText}>إرسال التذكرة</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  newBtn: { marginLeft: 'auto', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', writingDirection: 'rtl' },
  catCard: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  catIconBg: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catTitle: { flex: 1, fontSize: 15, fontFamily: 'Cairo_700Bold' },
  catCount: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', textAlign: 'center' },
  contactCTA: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8 },
  ctaTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold' },
  ctaSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  newTicketBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginBottom: 16 },
  newTicketText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  ticketCard: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  ticketTitle: { fontSize: 14, fontFamily: 'Cairo_700Bold', flex: 1 },
  ticketDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 20, textAlign: 'right' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  statusText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  tagText: { fontSize: 10, fontFamily: 'Cairo_500Medium' },
  formTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold' },
  label: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
  chipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  input: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Cairo_400Regular' },
  textarea: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Cairo_400Regular', minHeight: 120 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold' },
  submitBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12 },
  submitText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
