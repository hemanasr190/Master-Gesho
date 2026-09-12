import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Dimensions, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert, useAuth, getSupabaseClient } from '@/template';
import {
  fetchPlatformStats, fetchPendingTools, fetchRecentActivity,
  updateToolStatus, checkIsAdmin, deleteToolAdmin,
} from '../services/adminService';
import { createNotification } from '../services/notificationsService';
import { FunctionsHttpError } from '@supabase/supabase-js';

const SCREEN_W = Dimensions.get('window').width;

type Tab = 'overview' | 'pending' | 'recent' | 'analytics' | 'users';

// ─── Animated Bar Chart ───────────────────────────────────────────────────────
function BarItem({ item, color, theme, index }: { item: { label: string; value: number; max: number }; color: string; theme: any; index: number }) {
  const pct = item.max > 0 ? (item.value / item.max) * 100 : 0;
  const w = useSharedValue(0);
  useEffect(() => { w.value = withDelay(index * 80, withTiming(pct, { duration: 700 })); }, [pct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${w.value}%` as any }));
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, fontFamily: 'Cairo_500Medium', color: theme.textSecondary }}>{item.label}</Text>
        <Text style={{ fontSize: 12, fontFamily: 'Cairo_700Bold', color }}>{item.value.toLocaleString()}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', borderRadius: 4, backgroundColor: color }, barStyle]} />
      </View>
    </View>
  );
}

function BarChart({ data, color, theme }: { data: { label: string; value: number; max: number }[]; color: string; theme: any }) {
  return (
    <View style={{ gap: 10 }}>
      {data.map((item, i) => <BarItem key={item.label} item={item} color={color} theme={theme} index={i} />)}
    </View>
  );
}

// ─── Stat Metric Card ─────────────────────────────────────────────────────────
function MetricCard({ icon, value, label, color, change, delay = 0 }: {
  icon: string; value: string | number; label: string; color: string; change?: string; delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(delay)} style={{ flex: 1 }}>
      <LinearGradient colors={[color + '25', color + '08']} style={mc.card}>
        <View style={[mc.iconBg, { backgroundColor: color + '25' }]}>
          <MaterialIcons name={icon as any} size={22} color={color} />
        </View>
        <Text style={[mc.value, { color }]}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
        <Text style={mc.label}>{label}</Text>
        {change && (
          <View style={[mc.changeBadge, { backgroundColor: change.startsWith('+') ? '#22C55E20' : '#EF444420' }]}>
            <MaterialIcons name={change.startsWith('+') ? 'trending-up' : 'trending-down'} size={10} color={change.startsWith('+') ? '#22C55E' : '#EF4444'} />
            <Text style={[mc.changeText, { color: change.startsWith('+') ? '#22C55E' : '#EF4444' }]}>{change}</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const mc = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, minHeight: 110 },
  iconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  value: { fontSize: 26, fontFamily: 'Cairo_700Bold' },
  label: { fontSize: 11, fontFamily: 'Cairo_500Medium', color: '#64748B', textAlign: 'center' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999, marginTop: 2 },
  changeText: { fontSize: 9, fontFamily: 'Cairo_700Bold' },
});

// ─── Quick Action Button ──────────────────────────────────────────────────────
function QuickAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[qa.btn, { backgroundColor: color + '15', borderColor: color + '30' }]}>
      <View style={[qa.iconBg, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[qa.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const qa = StyleSheet.create({
  btn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  iconBg: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', textAlign: 'center' },
});

// ─── Category Distribution Chart ─────────────────────────────────────────────
function CategoryDistribution({ tools, theme }: { tools: any[]; theme: any }) {
  const cats = useMemo(() => {
    const counts: Record<string, number> = {};
    tools.forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
    const total = tools.length || 1;
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([cat, count]) => ({ label: cat, value: count, pct: Math.round((count / total) * 100) }));
  }, [tools]);

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

  return (
    <View style={{ gap: 10 }}>
      {cats.map((cat, i) => {
        const color = COLORS[i % COLORS.length];
        return (
          <View key={cat.label}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                <Text style={{ fontSize: 12, fontFamily: 'Cairo_500Medium', color: theme.textSecondary }}>{cat.label}</Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: 'Cairo_700Bold', color }}>{cat.value} ({cat.pct}%)</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden' }}>
              <Animated.View
                entering={FadeIn.duration(400).delay(i * 60)}
                style={{ height: '100%', borderRadius: 3, backgroundColor: color, width: `${cat.pct}%` as any }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalTools: 0, totalUsers: 0, totalVotes: 0, totalComments: 0 });
  const [pendingTools, setPendingTools] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ recentTools: any[]; recentComments: any[] }>({ recentTools: [], recentComments: [] });

  // Users tab state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const s = useMemo(() => createStyles(theme), [theme]);

  const loadData = useCallback(async () => {
    const [statsData, pending, activity] = await Promise.all([
      fetchPlatformStats(),
      fetchPendingTools(),
      fetchRecentActivity(),
    ]);
    setStats(statsData);
    setPendingTools(pending);
    setRecentActivity(activity);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    checkIsAdmin(user.id).then(admin => {
      setIsAdmin(admin);
      if (admin) loadData().finally(() => setLoading(false));
      else setLoading(false);
    });
  }, [user?.id, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleApprove = useCallback(async (tool: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateToolStatus(tool.id, 'approved');
    if (tool.submittedBy) {
      await createNotification({
        userId: tool.submittedBy,
        type: 'tool_approved',
        title: 'تمت الموافقة على أداتك',
        body: `تم قبول أداة "${tool.name}" ونشرها على المنصة`,
        toolId: tool.id,
      });
    }
    setPendingTools(prev => prev.filter(t => t.id !== tool.id));
    showAlert('تمت الموافقة', `تم نشر "${tool.name}" على المنصة`);
  }, [showAlert]);

  const handleReject = useCallback(async (tool: any) => {
    showAlert('رفض الأداة', `هل تريد رفض "${tool.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'رفض', style: 'destructive', onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          await updateToolStatus(tool.id, 'rejected');
          if (tool.submittedBy) {
            await createNotification({
              userId: tool.submittedBy,
              type: 'tool_rejected',
              title: 'تم رفض أداتك',
              body: `للأسف، لم يتم قبول أداة "${tool.name}" في هذه المرحلة`,
              toolId: tool.id,
            });
          }
          setPendingTools(prev => prev.filter(t => t.id !== tool.id));
        },
      },
    ]);
  }, [showAlert]);

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView edges={['top']} style={[s.container, { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }]}>
        <LinearGradient colors={['#EF444420', '#EF444408']} style={{ width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="admin-panel-settings" size={52} color="#EF4444" />
        </LinearGradient>
        <Text style={s.noAccessTitle}>غير مصرح بالوصول</Text>
        <Text style={s.noAccessSub}>هذه الصفحة مخصصة للمسؤولين فقط</Text>
        <Pressable onPress={() => router.back()} style={[s.backBtnLarge, { backgroundColor: theme.primary }]}>
          <Text style={{ color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 16 }}>العودة</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: 'dashboard' },
    { id: 'analytics', label: 'التحليلات', icon: 'bar-chart' },
    { id: 'pending', label: `المراجعة (${pendingTools.length})`, icon: 'pending-actions' },
    { id: 'recent', label: 'النشاط', icon: 'history' },
    { id: 'users', label: 'المستخدمون', icon: 'people' },
  ];

  // ── Load users ────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (search = usersSearch, page = 1) => {
    if (!user?.id) return;
    setUsersLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: null,
        headers: { 'x-page': String(page), 'x-search': search },
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const t = await error.context?.text(); msg = t || msg; } catch {}
        }
        console.error('admin-users error:', msg);
        return;
      }
      if (page === 1) setUsersList(data?.users || []);
      else setUsersList(prev => [...prev, ...(data?.users || [])]);
      setUsersTotal(data?.total || 0);
      setUsersPage(page);
    } catch (e) { console.error('loadUsers error:', e); }
    finally { setUsersLoading(false); }
  }, [user?.id, usersSearch]);

  useEffect(() => {
    if (tab === 'users' && usersList.length === 0) loadUsers('', 1);
  }, [tab]);

  const handleUsersSearch = useCallback((text: string) => {
    setUsersSearch(text);
    const timer = setTimeout(() => loadUsers(text, 1), 500);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handleToggleAdmin = useCallback(async (targetUser: any) => {
    if (!user?.id) return;
    const newVal = !targetUser.is_admin;
    showAlert(
      newVal ? 'منح صلاحيات المسؤول' : 'إلغاء صلاحيات المسؤول',
      `هل تريد ${newVal ? 'منح' : 'إلغاء'} صلاحيات الإدارة لـ ${targetUser.email}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد', style: newVal ? 'default' : 'destructive',
          onPress: async () => {
            setTogglingUserId(targetUser.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              const supabase = getSupabaseClient();
              const { data, error } = await supabase.functions.invoke('admin-users', {
                method: 'POST',
                body: { userId: targetUser.id, isAdmin: newVal },
              } as any);
              if (error) throw error;
              setUsersList(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_admin: newVal } : u));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e: any) {
              showAlert('خطأ', e?.message || 'فشل التحديث');
            } finally { setTogglingUserId(null); }
          },
        },
      ],
    );
  }, [user?.id, showAlert]);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Header */}
      <LinearGradient colors={[theme.primary + '30', theme.background]} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>لوحة التحكم</Text>
          <Text style={s.headerSub}>مرحباً، مسؤول المنصة</Text>
        </View>
        <View style={s.adminBadge}>
          <MaterialIcons name="verified-user" size={12} color="#FFF" />
          <Text style={s.adminBadgeText}>Admin</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
        {tabs.map(t => (
          <Pressable key={t.id} style={[s.tabChip, tab === t.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => { Haptics.selectionAsync(); setTab(t.id); }}>
            <MaterialIcons name={t.icon as any} size={14} color={tab === t.id ? '#FFF' : theme.textSecondary} />
            <Text style={[s.tabChipText, tab === t.id && { color: '#FFF', fontFamily: 'Cairo_700Bold' }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
      >

        {/* ══════════ OVERVIEW TAB ══════════ */}
        {tab === 'overview' && (
          <>
            {/* Alert */}
            {pendingTools.length > 0 && (
              <Animated.View entering={FadeInDown.duration(300)}>
                <Pressable onPress={() => setTab('pending')}
                  style={[s.alertBanner, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B40' }]}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="pending-actions" size={20} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#F59E0B' }}>{pendingTools.length} أداة تنتظر المراجعة</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Cairo_400Regular', color: theme.textMuted }}>انقر للمراجعة والموافقة</Text>
                  </View>
                  <MaterialIcons name="arrow-back" size={18} color="#F59E0B" />
                </Pressable>
              </Animated.View>
            )}

            {/* Metric Cards */}
            <Text style={s.sectionLabel}>إحصائيات المنصة</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <MetricCard icon="apps" value={stats.totalTools} label="الأدوات" color={theme.primary} change="+5%" delay={0} />
              <MetricCard icon="people" value={stats.totalUsers} label="المستخدمون" color={theme.accent} change="+12%" delay={80} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <MetricCard icon="arrow-upward" value={stats.totalVotes} label="التصويتات" color={theme.upvote} change="+8%" delay={160} />
              <MetricCard icon="comment" value={stats.totalComments} label="التعليقات" color="#A78BFA" change="+3%" delay={240} />
            </View>

            {/* Quick Actions */}
            <Text style={s.sectionLabel}>إجراءات سريعة</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <QuickAction icon="add-circle" label="إضافة أداة" color={theme.primary} onPress={() => router.push('/submit-tool' as any)} />
              <QuickAction icon="send" label="إشعار جماعي" color="#8B5CF6" onPress={() => showAlert('قريباً', 'سيتوفر هذا الخيار قريباً')} />
              <QuickAction icon="download" label="تصدير البيانات" color="#10B981" onPress={() => showAlert('قريباً', 'سيتوفر هذا الخيار قريباً')} />
              <QuickAction icon="settings" label="الإعدادات" color="#F59E0B" onPress={() => showAlert('قريباً', 'سيتوفر هذا الخيار قريباً')} />
            </View>

            {/* System Info */}
            <Text style={s.sectionLabel}>معلومات النظام</Text>
            <View style={[s.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {[
                { label: 'إصدار المنصة', value: '1.0.0', icon: 'info', color: theme.primary },
                { label: 'البيئة', value: 'OnSpace Cloud', icon: 'cloud', color: '#10B981' },
                { label: 'قاعدة البيانات', value: 'PostgreSQL (Supabase)', icon: 'storage', color: '#8B5CF6' },
                { label: 'الحالة', value: '✅ مفعّل', icon: 'check-circle', color: '#22C55E' },
                { label: 'وقت التشغيل', value: '99.9% Uptime', icon: 'speed', color: '#F59E0B' },
              ].map((item, i) => (
                <View key={item.label} style={[s.infoRow, i < 4 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialIcons name={item.icon as any} size={16} color={item.color} />
                    <Text style={s.infoLabel}>{item.label}</Text>
                  </View>
                  <Text style={[s.infoValue, { color: item.color }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ══════════ ANALYTICS TAB ══════════ */}
        {tab === 'analytics' && (
          <>
            <Text style={s.sectionLabel}>توزيع الفئات</Text>
            <Animated.View entering={FadeInDown.duration(350)} style={[s.analyticsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={s.cardHeader}>
                <View style={[s.cardIconBg, { backgroundColor: '#3B82F620' }]}>
                  <MaterialIcons name="pie-chart" size={18} color="#3B82F6" />
                </View>
                <Text style={[s.cardTitle, { color: theme.textPrimary }]}>الأدوات حسب الفئة</Text>
                <Text style={[s.cardSub, { color: theme.textMuted }]}>{recentActivity.recentTools.length} أداة</Text>
              </View>
              <CategoryDistribution tools={recentActivity.recentTools} theme={theme} />
            </Animated.View>

            <Text style={[s.sectionLabel, { marginTop: 16 }]}>أداء المحتوى</Text>
            <Animated.View entering={FadeInDown.duration(350).delay(80)} style={[s.analyticsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={s.cardHeader}>
                <View style={[s.cardIconBg, { backgroundColor: '#10B98120' }]}>
                  <MaterialIcons name="bar-chart" size={18} color="#10B981" />
                </View>
                <Text style={[s.cardTitle, { color: theme.textPrimary }]}>مؤشرات الأداء</Text>
              </View>
              <BarChart
                theme={theme}
                color="#10B981"
                data={[
                  { label: 'الأدوات المعتمدة', value: stats.totalTools, max: Math.max(stats.totalTools, 1) },
                  { label: 'إجمالي التصويتات', value: stats.totalVotes, max: Math.max(stats.totalVotes, 1) },
                  { label: 'إجمالي التعليقات', value: stats.totalComments, max: Math.max(stats.totalComments, 1) },
                  { label: 'المستخدمون النشطون', value: stats.totalUsers, max: Math.max(stats.totalUsers, 1) },
                ]}
              />
            </Animated.View>

            <Text style={[s.sectionLabel, { marginTop: 16 }]}>حالة الأدوات</Text>
            <Animated.View entering={FadeInDown.duration(350).delay(160)} style={[s.analyticsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={s.cardHeader}>
                <View style={[s.cardIconBg, { backgroundColor: '#8B5CF620' }]}>
                  <MaterialIcons name="donut-small" size={18} color="#8B5CF6" />
                </View>
                <Text style={[s.cardTitle, { color: theme.textPrimary }]}>توزيع حالة الأدوات</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { label: 'معتمدة', value: stats.totalTools - pendingTools.length, color: '#22C55E', icon: 'check-circle' },
                  { label: 'قيد المراجعة', value: pendingTools.length, color: '#F59E0B', icon: 'pending' },
                  { label: 'مرفوضة', value: 0, color: '#EF4444', icon: 'cancel' },
                ].map(item => (
                  <View key={item.label} style={[s.statusStat, { backgroundColor: item.color + '12', borderColor: item.color + '30' }]}>
                    <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                    <Text style={{ fontSize: 20, fontFamily: 'Cairo_700Bold', color: item.color }}>{item.value}</Text>
                    <Text style={{ fontSize: 10, fontFamily: 'Cairo_500Medium', color: theme.textMuted, textAlign: 'center' }}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Subscription stats */}
            <Text style={[s.sectionLabel, { marginTop: 16 }]}>إحصائيات الاشتراكات</Text>
            <Animated.View entering={FadeInDown.duration(350).delay(240)} style={[s.analyticsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={s.cardHeader}>
                <View style={[s.cardIconBg, { backgroundColor: '#F97316' + '20' }]}>
                  <MaterialIcons name="workspace-premium" size={18} color="#F97316" />
                </View>
                <Text style={[s.cardTitle, { color: theme.textPrimary }]}>خطط الاشتراك</Text>
              </View>
              {[
                { plan: 'المجاني', users: Math.max(0, stats.totalUsers - 5), pct: 95, color: '#64748B' },
                { plan: 'برو', users: 5, pct: 5, color: '#3B82F6' },
                { plan: 'المؤسسات', users: 0, pct: 0, color: '#8B5CF6' },
              ].map((item, i) => (
                <View key={item.plan} style={{ gap: 4, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Cairo_500Medium', color: theme.textSecondary }}>{item.plan}</Text>
                    <Text style={{ fontSize: 13, fontFamily: 'Cairo_700Bold', color: item.color }}>{item.users} مستخدم ({item.pct}%)</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 4, backgroundColor: item.color, width: `${item.pct}%` as any }} />
                  </View>
                </View>
              ))}
            </Animated.View>
          </>
        )}

        {/* ══════════ PENDING TAB ══════════ */}
        {tab === 'pending' && (
          <>
            <Text style={s.sectionLabel}>الأدوات قيد المراجعة ({pendingTools.length})</Text>
            {pendingTools.length === 0 ? (
              <Animated.View entering={FadeInDown.duration(350)} style={s.emptyState}>
                <LinearGradient colors={['#22C55E20', '#22C55E08']} style={{ width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <MaterialIcons name="check-circle" size={52} color={theme.accent} />
                </LinearGradient>
                <Text style={s.emptyTitle}>لا توجد أدوات قيد المراجعة</Text>
                <Text style={s.emptySub}>جميع الأدوات المرسلة تمت معالجتها</Text>
              </Animated.View>
            ) : (
              pendingTools.map((tool, idx) => (
                <Animated.View key={tool.id} entering={FadeInDown.duration(300).delay(idx * 60)} style={[s.pendingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={s.pendingHeader}>
                    <View style={[s.toolLogo, { backgroundColor: tool.logoColor + '20' }]}>
                      <MaterialIcons name={tool.logoIcon as any} size={22} color={tool.logoColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.toolName}>{tool.name}</Text>
                      <Text style={s.toolCategory}>{tool.category} · {tool.pricing}</Text>
                    </View>
                    <View style={[s.pendingBadge, { backgroundColor: '#F59E0B20' }]}>
                      <MaterialIcons name="pending" size={12} color="#F59E0B" />
                      <Text style={[s.pendingBadgeText, { color: '#F59E0B' }]}>قيد المراجعة</Text>
                    </View>
                  </View>
                  <Text style={s.toolDesc} numberOfLines={2}>{tool.shortDescription}</Text>
                  {tool.url ? (
                    <View style={[s.urlRow, { backgroundColor: theme.backgroundSecondary }]}>
                      <MaterialIcons name="link" size={13} color={theme.primary} />
                      <Text style={[s.toolUrl, { color: theme.primary }]} numberOfLines={1}>{tool.url}</Text>
                    </View>
                  ) : null}
                  <View style={s.tagsRow}>
                    {(tool.tags || []).slice(0, 4).map((tag: string) => (
                      <View key={tag} style={[s.tag, { backgroundColor: theme.backgroundSecondary }]}>
                        <Text style={[s.tagText, { color: theme.textMuted }]}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={s.actionRow}>
                    <Pressable style={[s.rejectBtn, { borderColor: theme.error + '60' }]} onPress={() => handleReject(tool)}>
                      <MaterialIcons name="close" size={18} color={theme.error} />
                      <Text style={[s.actionBtnText, { color: theme.error }]}>رفض</Text>
                    </Pressable>
                    <Pressable style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }} onPress={() => handleApprove(tool)}>
                      <LinearGradient colors={[theme.accent, theme.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.approveBtn}>
                        <MaterialIcons name="check" size={18} color="#FFF" />
                        <Text style={[s.actionBtnText, { color: '#FFF' }]}>موافقة ونشر</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </Animated.View>
              ))
            )}
          </>
        )}

        {/* ══════════ USERS TAB ══════════ */}
        {tab === 'users' && (
          <>
            {/* Search */}
            <View style={[s.userSearchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialIcons name="search" size={18} color={theme.textMuted} />
              <TextInput
                style={[s.userSearchInput, { color: theme.textPrimary }]}
                placeholder="ابحث بالبريد الإلكتروني..."
                placeholderTextColor={theme.textMuted}
                value={usersSearch}
                onChangeText={handleUsersSearch}
                textAlign="right"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {usersSearch.length > 0 && (
                <Pressable onPress={() => { setUsersSearch(''); loadUsers('', 1); }} hitSlop={8}>
                  <MaterialIcons name="close" size={16} color={theme.textMuted} />
                </Pressable>
              )}
            </View>

            <Text style={s.sectionLabel}>{usersTotal} مستخدم مسجّل</Text>

            {usersLoading && usersList.length === 0 ? (
              <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
            ) : usersList.length === 0 ? (
              <View style={s.emptyState}>
                <MaterialIcons name="people-outline" size={48} color={theme.textMuted} />
                <Text style={s.emptyTitle}>لا توجد نتائج</Text>
              </View>
            ) : (
              usersList.map((u, idx) => (
                <Animated.View key={u.id} entering={FadeInDown.duration(280).delay(Math.min(idx * 40, 400))}
                  style={[s.userCard, { backgroundColor: theme.surface, borderColor: u.is_admin ? theme.primary + '60' : theme.border }]}>
                  <View style={s.userCardLeft}>
                    {u.avatar_url ? (
                      <Image source={{ uri: u.avatar_url }} style={s.userAvatar} contentFit="cover" />
                    ) : (
                      <View style={[s.userAvatarFallback, { backgroundColor: theme.primary + '25' }]}>
                        <Text style={[s.userAvatarText, { color: theme.primary }]}>
                          {(u.email?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={s.userEmail} numberOfLines={1}>{u.email}</Text>
                        {u.is_admin && (
                          <View style={[s.adminChip, { backgroundColor: theme.primary + '20' }]}>
                            <MaterialIcons name="verified-user" size={9} color={theme.primary} />
                            <Text style={[s.adminChipText, { color: theme.primary }]}>Admin</Text>
                          </View>
                        )}
                      </View>
                      {u.username ? <Text style={s.userName2} numberOfLines={1}>{u.username}</Text> : null}
                      <Text style={s.userDate}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : 'تاريخ غير معروف'}
                      </Text>
                    </View>
                  </View>

                  {/* Stats row */}
                  <View style={s.userStats}>
                    <View style={s.userStat}>
                      <MaterialIcons name="bookmark" size={12} color={theme.primary} />
                      <Text style={[s.userStatVal, { color: theme.primary }]}>{u.saved_tools_count}</Text>
                    </View>
                    <View style={s.userStat}>
                      <MaterialIcons name="arrow-upward" size={12} color={theme.upvote} />
                      <Text style={[s.userStatVal, { color: theme.upvote }]}>{u.votes_count}</Text>
                    </View>
                    <View style={s.userStat}>
                      <MaterialIcons name="history" size={12} color="#8B5CF6" />
                      <Text style={[s.userStatVal, { color: '#8B5CF6' }]}>{u.activity_count}</Text>
                    </View>
                  </View>

                  {/* Toggle admin */}
                  {u.id !== user?.id && (
                    <Pressable
                      onPress={() => handleToggleAdmin(u)}
                      disabled={togglingUserId === u.id}
                      style={[s.adminToggleBtn, { borderColor: u.is_admin ? theme.error + '50' : theme.primary + '50', backgroundColor: u.is_admin ? theme.error + '10' : theme.primary + '10' }]}
                    >
                      {togglingUserId === u.id ? (
                        <ActivityIndicator size="small" color={u.is_admin ? theme.error : theme.primary} />
                      ) : (
                        <>
                          <MaterialIcons name={u.is_admin ? 'remove-moderator' : 'admin-panel-settings'} size={14} color={u.is_admin ? theme.error : theme.primary} />
                          <Text style={[s.adminToggleText, { color: u.is_admin ? theme.error : theme.primary }]}>
                            {u.is_admin ? 'إلغاء Admin' : 'منح Admin'}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </Animated.View>
              ))
            )}

            {/* Load more */}
            {usersList.length < usersTotal && !usersLoading && (
              <Pressable
                onPress={() => loadUsers(usersSearch, usersPage + 1)}
                style={[s.loadMoreBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
              >
                <Text style={[s.loadMoreText, { color: theme.primary }]}>تحميل المزيد ({usersTotal - usersList.length} متبقٍ)</Text>
              </Pressable>
            )}
            {usersLoading && usersList.length > 0 && (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 16 }} />
            )}
          </>
        )}

        {/* ══════════ RECENT TAB ══════════ */}
        {tab === 'recent' && (
          <>
            <Text style={s.sectionLabel}>الأدوات المضافة مؤخراً</Text>
            {recentActivity.recentTools.length === 0 ? (
              <View style={s.emptyState}>
                <MaterialIcons name="history" size={48} color={theme.textMuted} />
                <Text style={s.emptyTitle}>لا يوجد نشاط حديث</Text>
              </View>
            ) : (
              recentActivity.recentTools.map((tool: any, i) => (
                <Animated.View key={tool.id} entering={FadeInDown.duration(280).delay(i * 50)}
                  style={[s.activityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[s.activityIcon, { backgroundColor: (tool.logo_color || theme.primary) + '20' }]}>
                    <MaterialIcons name={(tool.logo_icon || 'apps') as any} size={18} color={tool.logo_color || theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.activityTitle}>{tool.name}</Text>
                    <Text style={[s.activitySub, { color: theme.textMuted }]}>{tool.category} · {tool.created_at?.split('T')[0]}</Text>
                  </View>
                  <View style={[s.statusBadge, {
                    backgroundColor: tool.status === 'approved' ? theme.accent + '20' : tool.status === 'pending' ? '#F59E0B20' : theme.error + '20',
                  }]}>
                    <Text style={[s.statusText, {
                      color: tool.status === 'approved' ? theme.accent : tool.status === 'pending' ? '#F59E0B' : theme.error,
                    }]}>
                      {tool.status === 'approved' ? 'منشور' : tool.status === 'pending' ? 'مراجعة' : 'مرفوض'}
                    </Text>
                  </View>
                </Animated.View>
              ))
            )}

            <Text style={[s.sectionLabel, { marginTop: 20 }]}>أحدث التعليقات</Text>
            {recentActivity.recentComments.map((comment: any, i) => (
              <Animated.View key={comment.id} entering={FadeInDown.duration(280).delay(i * 50)}
                style={[s.commentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[s.commentAvatar, { backgroundColor: theme.primary }]}>
                  <Text style={s.commentAvatarText}>
                    {(comment.user_profiles?.username || comment.user_profiles?.email || 'م')[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.commentUser, { color: theme.textPrimary }]}>{comment.user_profiles?.username || comment.user_profiles?.email || 'مستخدم'}</Text>
                  <Text style={[s.commentText, { color: theme.textSecondary }]} numberOfLines={2}>{comment.text}</Text>
                  <Text style={[s.commentDate, { color: theme.textMuted }]}>{comment.created_at?.split('T')[0]}</Text>
                </View>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  backBtnLarge: { paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: theme.textPrimary },
  headerSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.textMuted },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  adminBadgeText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  tabsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  tabChipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: theme.textSecondary },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  sectionLabel: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: theme.textMuted, marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1 },
  analyticsCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 0, gap: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  cardIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1, fontSize: 16, fontFamily: 'Cairo_700Bold' },
  cardSub: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  statusStat: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  infoLabel: { fontSize: 13, fontFamily: 'Cairo_500Medium', color: theme.textSecondary },
  infoValue: { fontSize: 13, fontFamily: 'Cairo_700Bold' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: 'Cairo_600SemiBold', color: theme.textPrimary },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.textMuted },
  pendingCard: { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  toolLogo: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: theme.textPrimary },
  toolCategory: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.textMuted, marginTop: 2 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  pendingBadgeText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  toolDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.textSecondary, textAlign: 'right', lineHeight: 20, marginBottom: 8 },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  toolUrl: { fontSize: 11, fontFamily: 'Cairo_400Regular', flex: 1 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  tagText: { fontSize: 10, fontFamily: 'Cairo_500Medium' },
  actionRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  actionBtnText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  activityCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  activityIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: theme.textPrimary },
  activitySub: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  statusText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  commentCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentAvatarText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  commentUser: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  commentText: { fontSize: 13, fontFamily: 'Cairo_400Regular', marginTop: 2, textAlign: 'right' },
  commentDate: { fontSize: 10, fontFamily: 'Cairo_400Regular', marginTop: 4 },
  noAccessTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: theme.textPrimary, textAlign: 'center' },
  noAccessSub: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.textMuted, textAlign: 'center' },

  // Users tab
  userSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, height: 46, borderRadius: 12, borderWidth: 1, marginBottom: 14,
  },
  userSearchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', writingDirection: 'rtl' },
  userCard: {
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, gap: 10,
  },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, flexShrink: 0 },
  userAvatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  userAvatarText: { fontSize: 18, fontFamily: 'Cairo_700Bold' },
  userEmail: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: theme.textPrimary, flex: 1 },
  userName2: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: theme.textSecondary },
  userDate: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: theme.textMuted, marginTop: 2 },
  adminChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999, flexShrink: 0 },
  adminChipText: { fontSize: 9, fontFamily: 'Cairo_700Bold' },
  userStats: { flexDirection: 'row', gap: 16, paddingHorizontal: 4 },
  userStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userStatVal: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
  adminToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 9, borderWidth: 1.5, minHeight: 34,
  },
  adminToggleText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  loadMoreBtn: {
    marginTop: 4, marginBottom: 12, paddingVertical: 13,
    borderRadius: 12, borderWidth: 1, alignItems: 'center',
  },
  loadMoreText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
});
