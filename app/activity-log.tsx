import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '@/template';
import {
  fetchActivityLogs, groupByDate, ACTION_LABELS, ACTION_ICONS, ACTION_COLORS,
  ActivityLog, ActivityAction,
} from '../services/activityService';

const ACTION_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'save_tool', label: 'الحفظ' },
  { id: 'vote_tool', label: 'التصويت' },
  { id: 'comment', label: 'التعليقات' },
  { id: 'generate_image', label: 'AI صورة' },
  { id: 'ai_chat', label: 'AI محادثة' },
  { id: 'read_post', label: 'القراءة' },
];

function LogItem({ log, theme, index }: { log: ActivityLog; theme: any; index: number }) {
  const action = log.action as ActivityAction;
  const label = ACTION_LABELS[action] || log.action;
  const icon = ACTION_ICONS[action] || 'history';
  const color = ACTION_COLORS[action] || theme.primary;
  const time = new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return (
    <Animated.View entering={FadeInDown.duration(240).delay(Math.min(index * 30, 400))}
      style={[li.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[li.iconBg, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[li.label, { color: theme.textPrimary }]}>{label}</Text>
        {log.metadata?.name && (
          <Text style={[li.sub, { color: theme.textMuted }]} numberOfLines={1}>{log.metadata.name}</Text>
        )}
        {log.target_type && !log.metadata?.name && (
          <Text style={[li.sub, { color: theme.textMuted }]}>{log.target_type}</Text>
        )}
      </View>
      <Text style={[li.time, { color: theme.textMuted }]}>{time}</Text>
    </Animated.View>
  );
}

const li = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  iconBg: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  sub: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  time: { fontSize: 10, fontFamily: 'Cairo_400Regular', flexShrink: 0 },
});

export default function ActivityLogScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchActivityLogs(user.id, actionFilter === 'all' ? undefined : actionFilter as ActivityAction, 80);
    setLogs(data);
  }, [user?.id, actionFilter]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const grouped = useMemo(() => groupByDate(logs), [logs]);
  const totalCount = logs.length;

  // Stats
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 4);
  }, [logs]);

  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={s.title}>سجل النشاط</Text>
          <Text style={s.sub}>{totalCount} حدث مسجّل</Text>
        </View>
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {ACTION_FILTERS.map(f => (
          <Pressable key={f.id} style={[s.chip, actionFilter === f.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => { setActionFilter(f.id); Haptics.selectionAsync(); }}>
            <Text style={[s.chipText, actionFilter === f.id && { color: '#FFF' }]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : logs.length === 0 ? (
        <View style={s.emptyBox}>
          <MaterialIcons name="history" size={52} color={theme.textMuted} />
          <Text style={s.emptyTitle}>لا توجد أنشطة مسجّلة</Text>
          <Text style={[s.emptySub, { color: theme.textMuted }]}>ابدأ التفاعل مع المنصة لتظهر هنا أنشطتك</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
        >
          {/* Quick stats */}
          {stats.length > 0 && actionFilter === 'all' && (
            <Animated.View entering={FadeInDown.duration(300)} style={[s.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.statsTitle, { color: theme.textPrimary }]}>ملخص النشاط</Text>
              <View style={s.statsGrid}>
                {stats.map(([action, count], i) => {
                  const a = action as ActivityAction;
                  const color = ACTION_COLORS[a] || theme.primary;
                  return (
                    <View key={action} style={[s.statItem, { backgroundColor: color + '10', borderColor: color + '20' }]}>
                      <MaterialIcons name={(ACTION_ICONS[a] || 'history') as any} size={18} color={color} />
                      <Text style={[s.statVal, { color }]}>{count}</Text>
                      <Text style={[s.statLabel, { color: theme.textMuted }]}>{ACTION_LABELS[a] || action}</Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Grouped logs */}
          {Object.entries(grouped).map(([date, dateLogs]) => (
            <View key={date}>
              <View style={s.dateSep}>
                <View style={[s.dateLine, { backgroundColor: theme.border }]} />
                <Text style={[s.dateText, { color: theme.textMuted, backgroundColor: theme.background }]}>{date}</Text>
                <View style={[s.dateLine, { backgroundColor: theme.border }]} />
              </View>
              {dateLogs.map((log, i) => (
                <LogItem key={log.id} log={log} theme={theme} index={i} />
              ))}
            </View>
          ))}
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
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
  chipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', textAlign: 'center' },
  statsCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  statsTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statItem: { width: '47%', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1 },
  statVal: { fontSize: 22, fontFamily: 'Cairo_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Cairo_500Medium', textAlign: 'center' },
  dateSep: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 6, gap: 8 },
  dateLine: { flex: 1, height: 1 },
  dateText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', paddingHorizontal: 8 },
});
