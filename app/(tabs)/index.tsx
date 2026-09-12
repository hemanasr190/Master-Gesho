import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl,
  Dimensions, Animated as RNAnimated,
} from 'react-native';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown, FadeIn, ZoomIn, useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withDelay, interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { config } from '../../constants/config';
import { MOCK_POSTS, POST_CATEGORIES } from '../../services/postsService';
import { useAppContext } from '../../contexts/AppContext';
import ToolCard from '../../components/ToolCard';
import SearchBar from '../../components/SearchBar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', color, label }: { target: number; suffix?: string; color: string; label: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 24, fontFamily: 'Cairo_700Bold', color }}>
        {suffix}{count.toLocaleString('ar-EG')}
      </Text>
      <Text style={{ fontSize: 10, fontFamily: 'Cairo_500Medium', color: '#94A3B8', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

// ─── Platform Feature Card ─────────────────────────────────────────────────────
const PLATFORM_FEATURES = [
  { icon: 'auto-awesome', label: 'استوديو AI', route: '/ai-studio', gradient: ['#8B5CF6', '#6D28D9'] },
  { icon: 'message', label: 'الرسائل', route: '/messages', gradient: ['#3B82F6', '#2563EB'] },
  { icon: 'perm-media', label: 'الوسائط', route: '/media-center', gradient: ['#10B981', '#059669'] },
  { icon: 'library-books', label: 'البروبمت', route: '/prompt-center', gradient: ['#F59E0B', '#D97706'] },
  { icon: 'workspace-premium', label: 'الاشتراكات', route: '/subscription', gradient: ['#F97316', '#EA580C'] },
  { icon: 'help', label: 'المساعدة', route: '/help-center', gradient: ['#7C3AED', '#6D28D9'] },
  { icon: 'lightbulb', label: 'الاقتراحات', route: '/suggestions', gradient: ['#06B6D4', '#0891B2'] },
  { icon: 'cloud-done', label: 'حالة الخدمات', route: '/service-status', gradient: ['#22C55E', '#16A34A'] },
];

// ─── Hero Slider ──────────────────────────────────────────────────────────────
function HeroSlider({ tools, theme }: { tools: any[]; theme: any }) {
  const featured = tools.slice(0, 5);
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => {
        const next = (prev + 1) % featured.length;
        scrollRef.current?.scrollTo({ x: next * (SCREEN_WIDTH - 32), animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (featured.length === 0) return null;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32)))}
        contentContainerStyle={{ gap: 0 }}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH - 32}
      >
        {featured.map((tool, i) => {
          const color = theme.categoryColors[tool.category] || theme.primary;
          return (
            <Pressable
              key={tool.id}
              onPress={() => { Haptics.selectionAsync(); router.push(`/tool/${tool.id}` as any); }}
              style={{ width: SCREEN_WIDTH - 32 }}
            >
              <LinearGradient
                colors={[color + 'CC', color + '40', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={hs.card}
              >
                <View style={[hs.toolIcon, { backgroundColor: color + '30' }]}>
                  <MaterialIcons name={tool.logoIcon as any} size={44} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  {(tool.trending || tool.featured || tool.editorPick) && (
                    <View style={[hs.badge, { backgroundColor: color + '30' }]}>
                      <MaterialIcons name={tool.trending ? 'local-fire-department' : tool.editorPick ? 'verified' : 'fiber-new'} size={11} color={color} />
                      <Text style={[hs.badgeText, { color }]}>{tool.trending ? 'الأكثر رواجاً' : tool.editorPick ? 'اختيار المحرر' : 'جديد'}</Text>
                    </View>
                  )}
                  <Text style={[hs.toolName, { color: theme.textPrimary }]} numberOfLines={1}>{tool.name}</Text>
                  <Text style={[hs.toolDesc, { color: theme.textSecondary }]} numberOfLines={2}>{tool.shortDescription}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' }}>
                    <View style={[hs.statPill, { backgroundColor: theme.surface }]}>
                      <MaterialIcons name="star" size={11} color={theme.star} />
                      <Text style={[hs.statText, { color: theme.textSecondary }]}>{tool.rating}</Text>
                    </View>
                    <View style={[hs.statPill, { backgroundColor: theme.surface }]}>
                      <MaterialIcons name="arrow-upward" size={11} color={theme.upvote} />
                      <Text style={[hs.statText, { color: theme.textSecondary }]}>{tool.votes}</Text>
                    </View>
                    <View style={[hs.pricingPill, { backgroundColor: tool.pricing === 'مجاني' ? '#22C55E20' : '#F59E0B20' }]}>
                      <Text style={{ fontSize: 9, fontFamily: 'Cairo_600SemiBold', color: tool.pricing === 'مجاني' ? '#22C55E' : '#F59E0B' }}>{tool.pricing}</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 }}>
        {featured.map((_, i) => (
          <Pressable key={i} onPress={() => {
            setCurrent(i);
            scrollRef.current?.scrollTo({ x: i * (SCREEN_WIDTH - 32), animated: true });
          }}>
            <View style={[hs.dot, i === current && { width: 20, backgroundColor: theme.primary }]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const hs = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 120 },
  toolIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, alignSelf: 'flex-start', marginBottom: 5 },
  badgeText: { fontSize: 9, fontFamily: 'Cairo_600SemiBold' },
  toolName: { fontSize: 17, fontFamily: 'Cairo_700Bold', marginBottom: 3 },
  toolDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9999 },
  statText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  pricingPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9999 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#475569' },
});

// ─── Trending Live Banner ──────────────────────────────────────────────────────
function LiveTrendingBanner({ tools, theme }: { tools: any[]; theme: any }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const opacity = useSharedValue(1);
  const top3 = tools.slice(0, 3);

  useEffect(() => {
    if (top3.length <= 1) return;
    const timer = setInterval(() => {
      opacity.value = withTiming(0, { duration: 300 }, () => {
        setCurrentIdx(prev => (prev + 1) % top3.length);
        opacity.value = withTiming(1, { duration: 400 });
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [top3.length]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const tool = top3[currentIdx];
  if (!tool) return null;

  return (
    <View style={[tb.banner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={tb.liveRow}>
        <View style={tb.liveDot} />
        <Text style={[tb.liveText, { color: '#EF4444' }]}>مباشر</Text>
      </View>
      <Animated.Text style={[tb.trendText, { color: theme.textPrimary }, animStyle]} numberOfLines={1}>
        🔥 {tool.name} — {tool.shortDescription}
      </Animated.Text>
    </View>
  );
}

const tb = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginBottom: 12, borderRadius: 10, borderWidth: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  liveText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
  trendText: { flex: 1, fontSize: 12, fontFamily: 'Cairo_500Medium' },
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, onSeeAll, color, iconBg }: { icon: string; title: string; onSeeAll?: () => void; color?: string; iconBg?: string }) {
  const { theme: sTheme } = useTheme();
  return (
    <View style={sh.row}>
      <View style={[sh.iconBg, { backgroundColor: (iconBg || color || '#3B82F6') + '20' }]}>
        <MaterialIcons name={icon as any} size={18} color={color || '#3B82F6'} />
      </View>
      <Text style={[sh.title, { color: sTheme.textPrimary }]}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} style={sh.seeAllBtn}>
          <Text style={sh.seeAll}>عرض الكل</Text>
          <MaterialIcons name="arrow-back" size={14} color="#3B82F6" />
        </Pressable>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  iconBg: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#F8FAFC' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAll: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#3B82F6' },
});

// ─── Daily Challenges ────────────────────────────────────────────────────────
const CHALLENGES_KEY = '@mgisho_challenges_v1';

function DailyChallenges() {
  const { theme: ct } = useTheme();
  const router = useRouter();
  const { votedToolIds, savedToolIds } = useAppContext();
  const today = new Date().toISOString().split('T')[0];
  const [manualDone, setManualDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    AsyncStorage.getItem(CHALLENGES_KEY).then(raw => {
      if (!raw) return;
      try { const { date, done } = JSON.parse(raw); if (date === today) setManualDone(done || {}); } catch {}
    });
  }, []);
  const markDone = useCallback((cid: string) => {
    const next = { ...manualDone, [cid]: true };
    setManualDone(next);
    AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify({ date: today, done: next }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [manualDone, today]);
  const vProg = Math.min(votedToolIds.length, 3);
  const sProg = Math.min(savedToolIds.length, 2);
  const chs = [
    { id: 'vote', label: 'صوّت على 3 أدوات', progress: vProg, total: 3, pts: 15, icon: 'arrow-upward' as const, color: ct.upvote, auto: true, route: '' },
    { id: 'save', label: 'احفظ أداتين', progress: sProg, total: 2, pts: 10, icon: 'bookmark' as const, color: ct.primary, auto: true, route: '' },
    { id: 'comment', label: 'علّق على أداة', progress: manualDone['comment'] ? 1 : 0, total: 1, pts: 20, icon: 'comment' as const, color: '#8B5CF6', auto: false, route: '' },
    { id: 'ai', label: 'جرّب استوديو AI', progress: manualDone['ai'] ? 1 : 0, total: 1, pts: 25, icon: 'auto-awesome' as const, color: '#EC4899', auto: false, route: '/ai-studio' },
  ];
  const earned = chs.reduce((s, c) => c.progress >= c.total ? s + c.pts : s, 0);
  const maxPts = chs.reduce((s, c) => s + c.pts, 0);
  const pct = Math.round((earned / maxPts) * 100);
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(50)} style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <LinearGradient colors={['#1E3A5F', '#0A1628']} style={{ borderRadius: 18, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#F8FAFC' }}>🎯 تحديات اليوم</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Cairo_400Regular', color: '#64748B', marginTop: 2 }}>اكسب حتى {maxPts} نقطة يومياً</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#F59E0B' }}>{earned}</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Cairo_400Regular', color: '#64748B' }}>نقطة مكتسبة</Text>
          </View>
        </View>
        <View style={{ height: 5, backgroundColor: '#1E293B', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: '#F59E0B', borderRadius: 3 }} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {chs.map(ch => {
            const done = ch.progress >= ch.total;
            return (
              <Pressable key={ch.id}
                onPress={() => { if (done) return; if (ch.route) { Haptics.selectionAsync(); router.push(ch.route as any); } else if (!ch.auto) markDone(ch.id); }}
                style={{ width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: done ? ch.color + '22' : '#0F172A', borderRadius: 10, padding: 9, borderWidth: 1, borderColor: done ? ch.color + '55' : '#1E293B' }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: done ? ch.color + '30' : '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name={done ? 'check' : ch.icon} size={14} color={ch.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Cairo_600SemiBold', color: '#CBD5E1' }} numberOfLines={1}>{ch.label}</Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Cairo_600SemiBold', color: done ? ch.color : '#475569' }}>{done ? `+${ch.pts} نقطة ✓` : `${ch.progress}/${ch.total}`}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {pct === 100 && <View style={{ marginTop: 10, alignItems: 'center', backgroundColor: '#F59E0B12', borderRadius: 8, padding: 7 }}><Text style={{ fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#F59E0B' }}>🎉 أكملت جميع تحديات اليوم!</Text></View>}
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const {
    searchQuery, setSearchQuery, tools, loading,
    getTrendingTools, getNewTools, getEditorPicks, getRecommendedTools, getPersonalizedRecommendations,
    savedToolIds, votedToolIds,
  } = useAppContext();
  const { unreadCount } = useNotifications();

  const trending = useMemo(() => getTrendingTools(), [getTrendingTools]);
  const newTools = useMemo(() => getNewTools(), [getNewTools]);
  const editorPicks = useMemo(() => getEditorPicks(), [getEditorPicks]);
  const recommended = useMemo(() => getRecommendedTools(), [getRecommendedTools]);
  const personalized = useMemo(() => getPersonalizedRecommendations(), [getPersonalizedRecommendations]);
  const hasInteractions = savedToolIds.length > 0 || votedToolIds.length > 0;

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return tools.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.shortDescription.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.tags.some((tag: string) => tag.toLowerCase().includes(q))
    );
  }, [tools, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;
  const s = useMemo(() => createStyles(theme), [theme]);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 900));
    setRefreshing(false);
  }, []);

  const categoryIconMap: Record<string, string> = {
    'كتابة بالذكاء': 'edit', 'أدوات الصور': 'image', 'أدوات البيانات': 'analytics',
    'أدوات المطورين': 'code', 'أدوات مالية': 'account-balance', 'الإنتاجية': 'task-alt',
    'التصميم': 'palette', 'التسويق': 'campaign',
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
        >

        {/* ── Premium Header ── */}
        <LinearGradient
          colors={isDark ? ['#1E293B', '#0B1120'] : ['#EFF6FF', '#F1F5F9']}
          style={s.header}
        >
          <View>
            <Text style={s.logo}>مستر جيشو</Text>
            <Text style={s.tagline}>منصتك العربية لأدوات الذكاء الاصطناعي</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[s.iconBtn, { borderColor: theme.border }]} onPress={() => { Haptics.selectionAsync(); router.push('/messages' as any); }}>
              <MaterialIcons name="message" size={20} color={theme.textSecondary} />
            </Pressable>
            <Pressable style={[s.iconBtn, { borderColor: theme.border, position: 'relative' }]} onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/notifications'); }}>
              <MaterialIcons name={unreadCount > 0 ? 'notifications' : 'notifications-none'} size={22} color={unreadCount > 0 ? theme.primary : theme.textSecondary} />
              {unreadCount > 0 ? (
                <View style={[s.notifBadge, { backgroundColor: '#EF4444' }]}>
                  <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </LinearGradient>

        {/* ── Animated Stats Bar ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={[s.statsBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AnimatedCounter target={tools.length} suffix="+" color={theme.primary} label="أداة ذكية" />
          <View style={s.statsDivider} />
          <AnimatedCounter target={config.categories.length} color={theme.accent} label="فئة" />
          <View style={s.statsDivider} />
          <AnimatedCounter target={15000} suffix="+" color="#F59E0B" label="مستخدم" />
          <View style={s.statsDivider} />
          <AnimatedCounter target={trending.length > 0 ? trending[0]?.votes || 0 : 250} color="#A78BFA" label="تصويت اليوم" />
        </Animated.View>

        {/* ── Search ── */}
        <View style={s.searchRow}><SearchBar value={searchQuery} onChangeText={setSearchQuery} /></View>

        {isSearching ? (
          <View style={s.section}>
            <SectionHeader icon="search" title={`${filteredTools.length} نتيجة لـ "${searchQuery}"`} color={theme.primary} />
            <View style={s.verticalList}>
              {filteredTools.map(tool => <ToolCard key={tool.id} tool={tool} variant="vertical" />)}
              {filteredTools.length === 0 && (
                <View style={s.emptySearch}>
                  <MaterialIcons name="search-off" size={48} color={theme.textMuted} />
                  <Text style={s.emptyText}>لم يتم العثور على أدوات</Text>
                  <Text style={s.emptySubtext}>جرّب كلمات مفتاحية مختلفة</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <>
            {/* ── Live Trending Banner ── */}
            {trending.length > 0 && <LiveTrendingBanner tools={trending} theme={theme} />}

            {/* ── Platform Features Strip ── */}
            <View style={s.section}>
              <SectionHeader icon="grid-view" title="ميزات المنصة" color="#8B5CF6" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                {PLATFORM_FEATURES.map(f => (
                  <Pressable key={f.route} onPress={() => { Haptics.selectionAsync(); router.push(f.route as any); }}>
                    <View style={s.featureCard}>
                      <LinearGradient colors={f.gradient as [string, string]} style={s.featureIconBg}>
                        <MaterialIcons name={f.icon as any} size={22} color="#FFF" />
                      </LinearGradient>
                      <Text style={[s.featureLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* ── Daily Challenges ── */}
            <DailyChallenges />

            {/* ── Hero Slider ── */}
            <View style={s.sectionNopad}>
              <SectionHeader icon="auto-awesome" title="مميز لك" color={theme.primary} iconBg={theme.primary} />
            </View>
            <HeroSlider tools={trending} theme={theme} />

            {/* ── Category Grid ── */}
            <View style={s.section}>
              <SectionHeader icon="category" title="تصفح الفئات" color="#10B981" iconBg="#10B981"
                onSeeAll={() => router.push('/explore')} />
              <View style={s.catGrid}>
                {POST_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => { Haptics.selectionAsync(); router.push({ pathname: '/news', params: { category: cat.id } } as any); }}
                    style={[s.catGridItem, { backgroundColor: cat.color + '12', borderColor: cat.color + '30' }]}
                  >
                    <View style={[s.catGridIconBg, { backgroundColor: cat.color + '20' }]}>
                      <MaterialIcons name={cat.icon as any} size={26} color={cat.color} />
                    </View>
                    <Text style={[s.catGridLabel, { color: cat.color }]}>{cat.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── AI Studio Banner ── */}
            <Pressable onPress={() => { Haptics.selectionAsync(); router.push('/ai-studio' as any); }} style={{ marginHorizontal: 16, marginBottom: 20 }}>
              <LinearGradient colors={['#4C1D95', '#1E40AF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.aiBanner}>
                <View style={s.aiBannerLeft}>
                  <View style={s.aiBannerBadge}>
                    <MaterialIcons name="auto-awesome" size={10} color="#FFF" />
                    <Text style={s.aiBannerBadgeText}>جديد ومجاني</Text>
                  </View>
                  <Text style={s.aiBannerTitle}>استوديو الذكاء الاصطناعي</Text>
                  <Text style={s.aiBannerSub}>توليد صور · محادثة ذكية · مساعد كود · بروبمتات</Text>
                  <View style={s.aiBannerBtn}>
                    <Text style={s.aiBannerBtnText}>ابدأ الآن</Text>
                    <MaterialIcons name="arrow-back" size={14} color="#FFF" />
                  </View>
                </View>
                <View style={s.aiBannerRight}>
                  <Text style={{ fontSize: 52 }}>🤖</Text>
                </View>
              </LinearGradient>
            </Pressable>

            {/* ── Trending Tools ── */}
            <View style={s.section}>
              <SectionHeader icon="local-fire-department" title="الأكثر رواجاً" color={theme.trending}
                onSeeAll={() => router.push('/explore')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalScroll}>
                {trending.map((tool, idx) => <ToolCard key={tool.id} tool={tool} variant="horizontal" width={260} index={idx} />)}
              </ScrollView>
            </View>

            {/* ── Editor Picks ── */}
            <View style={s.section}>
              <SectionHeader icon="verified" title="اختيارات المحرر" color={theme.primary} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalScroll}>
                {editorPicks.map((tool, idx) => <ToolCard key={tool.id} tool={tool} variant="horizontal" width={260} index={idx} />)}
              </ScrollView>
            </View>

            {/* ── Category Filter Bar ── */}
            <View style={s.section}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catFilterRow}>
                {config.categories.map(cat => {
                  const color = theme.categoryColors[cat] || theme.primary;
                  return (
                    <Pressable key={cat} style={[s.catFilter, { borderColor: color + '50', backgroundColor: color + '10' }]}
                      onPress={() => { Haptics.selectionAsync(); router.push('/explore'); }}>
                      <MaterialIcons name={(categoryIconMap[cat] || 'category') as any} size={13} color={color} />
                      <Text style={[s.catFilterText, { color }]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── New This Week ── */}
            {newTools.length > 0 && (
              <View style={s.section}>
                <SectionHeader icon="fiber-new" title="جديد هذا الأسبوع" color={theme.accent} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalScroll}>
                  {newTools.map((tool, idx) => <ToolCard key={tool.id} tool={tool} variant="compact" width={160} index={idx} />)}
                </ScrollView>
              </View>
            )}

            {/* ── Personalized / Recommended ── */}
            {hasInteractions && personalized.groups.length > 0 ? (
              personalized.groups.slice(0, 3).map((group, gIdx) => (
                <View key={group.tag} style={s.section}>
                  <SectionHeader icon="auto-awesome" title={`لأنك أحببت ${group.tag}`} color="#A78BFA"
                    onSeeAll={gIdx === 0 ? () => router.push('/explore' as any) : undefined} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalScroll}>
                    {group.tools.slice(0, 8).map((tool, idx) => (
                      <ToolCard key={tool.id} tool={tool} variant="horizontal" width={240} index={idx} />
                    ))}
                  </ScrollView>
                </View>
              ))
            ) : (
              <View style={s.section}>
                <SectionHeader icon="recommend" title="اقتراحات AI لك" color="#A78BFA"
                  onSeeAll={() => router.push('/explore' as any)} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalScroll}>
                  {recommended.slice(0, 8).map((tool, idx) => (
                    <ToolCard key={tool.id} tool={tool} variant="horizontal" width={240} index={idx} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Tags Explorer ── */}
            <Pressable style={[s.section, { paddingHorizontal: 16 }]} onPress={() => { Haptics.selectionAsync(); router.push('/tags' as any); }}>
              <LinearGradient colors={[theme.primary + '18', '#A78BFA18']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.tagsShortcut}>
                <View style={[s.tagsIcon, { backgroundColor: theme.primary + '20' }]}>
                  <MaterialIcons name="tag" size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.tagsTitle, { color: theme.textPrimary }]}>استكشاف بالوسوم</Text>
                  <Text style={[s.tagsSub, { color: theme.textMuted }]}>تصفح الأدوات عبر الوسوم الأكثر شيوعاً</Text>
                </View>
                <MaterialIcons name="arrow-back" size={18} color={theme.primary} />
              </LinearGradient>
            </Pressable>

            {/* ── Top Rated Vertical ── */}
            {!hasInteractions && (
              <View style={s.section}>
                <SectionHeader icon="psychology" title="أفضل الأدوات تقييماً" color="#A78BFA" />
                <View style={s.verticalList}>
                  {recommended.slice(0, 5).map((tool, idx) => <ToolCard key={tool.id} tool={tool} variant="vertical" index={idx} />)}
                </View>
              </View>
            )}

            {/* ── News & Posts Section ── */}
            <View style={s.section}>
              <SectionHeader icon="article" title="المنشورات والأخبار" color={theme.primary}
                onSeeAll={() => { Haptics.selectionAsync(); router.push('/news' as any); }} />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, marginBottom: 14 }}>
                {POST_CATEGORIES.map(cat => (
                  <Pressable key={cat.id}
                    onPress={() => { Haptics.selectionAsync(); router.push({ pathname: '/news', params: { category: cat.id } } as any); }}
                    style={[s.newsCatBtn, { backgroundColor: cat.color + '14', borderColor: cat.color + '35' }]}>
                    <View style={[s.newsCatIconBg, { backgroundColor: cat.color + '22' }]}>
                      <MaterialIcons name={cat.icon as any} size={20} color={cat.color} />
                    </View>
                    <Text style={[s.newsCatLabel, { color: cat.color }]}>{cat.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ paddingHorizontal: 16, gap: 10 }}>
                {MOCK_POSTS.slice(0, 3).map(post => (
                  <Pressable key={post.id}
                    onPress={() => { Haptics.selectionAsync(); router.push(`/post/${post.id}` as any); }}
                    style={[s.newsPostCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={[s.newsPostEmoji, { backgroundColor: post.categoryColor + '15', borderColor: post.categoryColor + '25' }]}>
                      <Text style={{ fontSize: 22 }}>{post.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={[s.newsPostCat, { backgroundColor: post.categoryColor + '18' }]}>
                        <MaterialIcons name={post.categoryIcon as any} size={10} color={post.categoryColor} />
                        <Text style={[s.newsPostCatText, { color: post.categoryColor }]}>{POST_CATEGORIES.find(c => c.id === post.category)?.label}</Text>
                      </View>
                      <Text style={[s.newsPostTitle, { color: theme.textPrimary }]} numberOfLines={2}>{post.title}</Text>
                      <Text style={[s.newsPostMeta, { color: theme.textMuted }]}>{post.readTime} دق · {post.views.toLocaleString('ar-EG')} مشاهدة</Text>
                    </View>
                    <MaterialIcons name="arrow-back" size={16} color={theme.textMuted} />
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => { Haptics.selectionAsync(); router.push('/news' as any); }}
                style={[s.newsAllBtn, { borderColor: theme.primary + '40', backgroundColor: theme.primary + '10', marginHorizontal: 16, marginTop: 10 }]}>
                <MaterialIcons name="feed" size={16} color={theme.primary} />
                <Text style={[s.newsAllBtnText, { color: theme.primary }]}>استعرض جميع المنشورات ({MOCK_POSTS.length})</Text>
                <MaterialIcons name="arrow-back" size={14} color={theme.primary} />
              </Pressable>
            </View>

            {/* ── Footer Trust Bar ── */}
            <Animated.View entering={FadeInDown.duration(400).delay(200)} style={[s.trustBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {[
                { icon: 'security', label: 'آمن 100%', color: '#22C55E' },
                { icon: 'speed', label: 'سريع الاستجابة', color: '#3B82F6' },
                { icon: 'support-agent', label: 'دعم 24/7', color: '#8B5CF6' },
                { icon: 'verified', label: 'محتوى موثوق', color: '#F59E0B' },
              ].map((item, i) => (
                <View key={i} style={s.trustItem}>
                  <View style={[s.trustIconBg, { backgroundColor: item.color + '20' }]}>
                    <MaterialIcons name={item.icon as any} size={16} color={item.color} />
                  </View>
                  <Text style={[s.trustLabel, { color: theme.textMuted }]}>{item.label}</Text>
                </View>
              ))}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  logo: { fontSize: 26, fontFamily: 'Cairo_700Bold', color: theme.textPrimary, letterSpacing: -0.5 },
  tagline: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.textMuted, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  notifBadge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText: { fontSize: 9, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  statsBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, marginBottom: 4 },
  statsDivider: { width: 1, height: 32, backgroundColor: theme.border },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  section: { marginBottom: 20 },
  sectionNopad: { marginBottom: 6 },
  horizontalScroll: { paddingHorizontal: 16, gap: 12 },
  verticalList: { paddingHorizontal: 16, gap: 12 },

  // Features
  featureCard: { alignItems: 'center', gap: 6, width: 72 },
  featureIconBg: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', textAlign: 'center' },

  // Hero Slider done above

  // Category Grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  catGridItem: { width: (SCREEN_WIDTH - 32 - 30) / 4, borderRadius: 16, borderWidth: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, gap: 7 },
  catGridIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catGridLabel: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', textAlign: 'center', lineHeight: 14 },

  // AI Banner
  aiBanner: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center' },
  aiBannerLeft: { flex: 1, gap: 6 },
  aiBannerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, alignSelf: 'flex-start' },
  aiBannerBadgeText: { fontSize: 9, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  aiBannerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  aiBannerSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  aiBannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, alignSelf: 'flex-start', marginTop: 4 },
  aiBannerBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  aiBannerRight: { alignItems: 'center', justifyContent: 'center' },

  // Category filter bar
  catFilterRow: { paddingHorizontal: 16, gap: 8 },
  catFilter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999, borderWidth: 1.5 },
  catFilterText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },

  // Tags Shortcut
  tagsShortcut: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.primary + '30' },
  tagsIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tagsTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold' },
  tagsSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', marginTop: 2 },

  // News section
  newsCatBtn: { alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, borderWidth: 1, minWidth: 68 },
  newsCatIconBg: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  newsCatLabel: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', textAlign: 'center' },
  newsPostCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  newsPostEmoji: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  newsPostCat: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9999, alignSelf: 'flex-start' },
  newsPostCatText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  newsPostTitle: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', lineHeight: 20 },
  newsPostMeta: { fontSize: 10, fontFamily: 'Cairo_400Regular' },
  newsAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center' },
  newsAllBtnText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', flex: 1, textAlign: 'center' },

  // Trust Bar
  trustBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 12 },
  trustItem: { flex: 1, alignItems: 'center', gap: 5 },
  trustIconBg: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  trustLabel: { fontSize: 9, fontFamily: 'Cairo_500Medium', textAlign: 'center' },

  // Search results
  emptySearch: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: theme.textSecondary },
  emptySubtext: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.textMuted },
});
