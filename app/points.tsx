import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '@/template';
import {
  fetchUserPoints, fetchPointsTransactions, getLevelForPoints, getLevelProgress,
  POINTS_LEVELS, POINTS_ACTIONS, UserPoints, PointsTransaction,
} from '../services/pointsService';

export default function PointsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [points, setPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [p, t] = await Promise.all([fetchUserPoints(user.id), fetchPointsTransactions(user.id)]);
    setPoints(p);
    setTransactions(t);
  }, [user?.id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const totalPoints = points?.total_points || 0;
  const currentLevel = useMemo(() => getLevelForPoints(totalPoints), [totalPoints]);
  const progress = useMemo(() => getLevelProgress(totalPoints, currentLevel), [totalPoints, currentLevel]);
  const nextLevel = POINTS_LEVELS.find(l => l.level === currentLevel.level + 1);

  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={s.title}>نقاطي ومكافآتي</Text>
          <Text style={s.sub}>اكسب نقاطاً بكل تفاعل</Text>
        </View>
        <View style={[s.levelBadge, { backgroundColor: currentLevel.color + '20', borderColor: currentLevel.color + '40' }]}>
          <Text style={{ fontSize: 16 }}>{currentLevel.icon}</Text>
          <Text style={[s.levelText, { color: currentLevel.color }]}>لv.{currentLevel.level}</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
        >
          {/* Level Banner */}
          <Animated.View entering={FadeInDown.duration(350)} style={{ margin: 16 }}>
            <LinearGradient
              colors={[currentLevel.color, currentLevel.color + 'AA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.levelBanner}
            >
              <Animated.View entering={ZoomIn.springify().damping(12)}>
                <Text style={s.levelEmoji}>{currentLevel.icon}</Text>
              </Animated.View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text style={s.levelTitle}>المستوى {currentLevel.level} · {currentLevel.title}</Text>
                <Text style={s.levelPoints}>{totalPoints.toLocaleString('ar-EG')} نقطة</Text>
              </View>

              {/* Progress bar */}
              <View style={{ width: '100%', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.progressLabel}>{currentLevel.minPoints.toLocaleString()} نقطة</Text>
                  {nextLevel && <Text style={s.progressLabel}>{nextLevel.minPoints.toLocaleString()} نقطة</Text>}
                </View>
                <View style={s.progressTrack}>
                  <Animated.View style={[s.progressFill, { width: `${progress}%` as any }]} />
                </View>
                <Text style={[s.progressLabel, { textAlign: 'center' }]}>
                  {nextLevel ? `${nextLevel.minPoints - totalPoints} نقطة للمستوى التالي` : 'أعلى مستوى!'}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* How to earn */}
          <Animated.View entering={FadeInDown.duration(300).delay(80)} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>كيفية كسب النقاط</Text>
            <View style={[s.earningCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {Object.entries(POINTS_ACTIONS).slice(0, 8).map(([action, info], i) => (
                <View key={action} style={[s.earningRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                  <MaterialIcons name={info.icon as any} size={18} color={theme.primary} />
                  <Text style={[s.earningLabel, { color: theme.textSecondary }]}>{info.label}</Text>
                  <View style={[s.pointsBadge, { backgroundColor: '#22C55E15' }]}>
                    <Text style={s.pointsBadgeText}>+{info.points}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Levels roadmap */}
          <Animated.View entering={FadeInDown.duration(300).delay(120)} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>مستويات الإنجاز</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4, paddingTop: 4 }}>
              {POINTS_LEVELS.map(level => {
                const isCurrentLevel = level.level === currentLevel.level;
                const isUnlocked = totalPoints >= level.minPoints;
                return (
                  <View key={level.level} style={[s.levelCard, { backgroundColor: isCurrentLevel ? level.color + '20' : theme.surface, borderColor: isCurrentLevel ? level.color : theme.border, borderWidth: isCurrentLevel ? 2 : 1 }]}>
                    <Text style={{ fontSize: 28 }}>{level.icon}</Text>
                    <Text style={[s.levelCardTitle, { color: isCurrentLevel ? level.color : theme.textSecondary }]}>لv.{level.level}</Text>
                    <Text style={[s.levelCardName, { color: isCurrentLevel ? level.color : theme.textPrimary }]}>{level.title}</Text>
                    <Text style={[s.levelCardPts, { color: theme.textMuted }]}>{level.minPoints}+ نقطة</Text>
                    {isUnlocked && <MaterialIcons name="check-circle" size={16} color={level.color} />}
                    {!isUnlocked && <MaterialIcons name="lock" size={14} color={theme.textMuted} />}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Transactions */}
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>سجل النقاط</Text>
            {transactions.length === 0 ? (
              <View style={s.emptyBox}>
                <MaterialIcons name="monetization-on" size={48} color={theme.textMuted} />
                <Text style={[s.emptyTitle, { color: theme.textSecondary }]}>لا توجد معاملات بعد</Text>
                <Text style={[s.emptySub, { color: theme.textMuted }]}>ابدأ التفاعل لكسب نقاطك</Text>
              </View>
            ) : (
              transactions.map((tx, i) => (
                <Animated.View key={tx.id} entering={FadeInDown.duration(240).delay(Math.min(i * 30, 400))}
                  style={[s.txRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[s.txIconBg, { backgroundColor: '#22C55E15' }]}>
                    <MaterialIcons name={(POINTS_ACTIONS[tx.action]?.icon || 'star') as any} size={18} color="#22C55E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.txLabel, { color: theme.textPrimary }]}>{tx.description}</Text>
                    <Text style={[s.txDate, { color: theme.textMuted }]}>
                      {new Date(tx.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={[s.txPoints, { color: '#22C55E' }]}>+{tx.points}</Text>
                </Animated.View>
              ))
            )}
          </View>
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
  levelBadge: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999, borderWidth: 1 },
  levelText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  levelBanner: { borderRadius: 20, padding: 20, alignItems: 'center', gap: 12 },
  levelEmoji: { fontSize: 48 },
  levelTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF', textAlign: 'center' },
  levelPoints: { fontSize: 32, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  progressLabel: { fontSize: 11, fontFamily: 'Cairo_500Medium', color: 'rgba(255,255,255,0.8)' },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden', width: '100%' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: '#FFF' },
  sectionTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', marginBottom: 12 },
  earningCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  earningRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  earningLabel: { flex: 1, fontSize: 13, fontFamily: 'Cairo_500Medium' },
  pointsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  pointsBadgeText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#22C55E' },
  levelCard: { width: 110, alignItems: 'center', gap: 4, padding: 14, borderRadius: 16 },
  levelCardTitle: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  levelCardName: { fontSize: 13, fontFamily: 'Cairo_700Bold', textAlign: 'center' },
  levelCardPts: { fontSize: 10, fontFamily: 'Cairo_400Regular', textAlign: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontFamily: 'Cairo_600SemiBold' },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  txIconBg: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txLabel: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  txDate: { fontSize: 10, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  txPoints: { fontSize: 16, fontFamily: 'Cairo_700Bold', flexShrink: 0 },
});
