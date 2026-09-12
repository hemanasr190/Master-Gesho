import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useAppContext } from '../contexts/AppContext';
import { compareStore } from '../services/compareStore';

export default function CompareScreen() {
  const { theme } = useTheme();
  const { tools } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(theme), [theme]);

  const [compareIds, setCompareIds] = useState(compareStore.getIds());
  useEffect(() => compareStore.subscribe(() => setCompareIds(compareStore.getIds())), []);

  const toolA = tools.find(t => t.id === compareIds[0]);
  const toolB = tools.find(t => t.id === compareIds[1]);

  const colorA = toolA ? (theme.categoryColors[toolA.category] || theme.primary) : theme.primary;
  const colorB = toolB ? (theme.categoryColors[toolB.category] || '#8B5CF6') : '#8B5CF6';

  // Define comparison rows
  const rows = useMemo(() => {
    if (!toolA || !toolB) return [];
    return [
      {
        label: 'التقييم', icon: 'star', color: theme.star,
        valA: toolA.rating.toFixed(1), valB: toolB.rating.toFixed(1),
        winner: toolA.rating > toolB.rating ? 'A' : toolB.rating > toolA.rating ? 'B' : 'tie',
      },
      {
        label: 'التصويتات', icon: 'arrow-upward', color: theme.upvote,
        valA: toolA.votes.toLocaleString('ar-EG'), valB: toolB.votes.toLocaleString('ar-EG'),
        winner: toolA.votes > toolB.votes ? 'A' : toolB.votes > toolA.votes ? 'B' : 'tie',
      },
      {
        label: 'عدد التقييمات', icon: 'people', color: theme.primary,
        valA: toolA.ratingCount.toLocaleString('ar-EG'), valB: toolB.ratingCount.toLocaleString('ar-EG'),
        winner: toolA.ratingCount > toolB.ratingCount ? 'A' : toolB.ratingCount > toolA.ratingCount ? 'B' : 'tie',
      },
      {
        label: 'التسعير', icon: 'local-offer', color: '#10B981',
        valA: toolA.pricing, valB: toolB.pricing,
        winner: (() => {
          const order = ['مجاني', 'مفتوح المصدر', 'مجاني جزئياً', 'مدفوع'];
          const iA = order.indexOf(toolA.pricing), iB = order.indexOf(toolB.pricing);
          return iA < iB ? 'A' : iB < iA ? 'B' : 'tie';
        })(),
      },
      {
        label: 'الفئة', icon: 'category', color: '#8B5CF6',
        valA: toolA.category, valB: toolB.category,
        winner: 'tie',
      },
      {
        label: 'المطور', icon: 'person', color: '#06B6D4',
        valA: toolA.developerName, valB: toolB.developerName,
        winner: toolA.developerFollowers > toolB.developerFollowers ? 'A' : toolB.developerFollowers > toolA.developerFollowers ? 'B' : 'tie',
      },
      {
        label: 'متابعو المطور', icon: 'group', color: '#F59E0B',
        valA: toolA.developerFollowers.toLocaleString('ar-EG'), valB: toolB.developerFollowers.toLocaleString('ar-EG'),
        winner: toolA.developerFollowers > toolB.developerFollowers ? 'A' : toolB.developerFollowers > toolA.developerFollowers ? 'B' : 'tie',
      },
    ] as const;
  }, [toolA, toolB, theme]);

  const winsA = rows.filter(r => r.winner === 'A').length;
  const winsB = rows.filter(r => r.winner === 'B').length;
  const overallWinner = winsA > winsB ? 'A' : winsB > winsA ? 'B' : 'tie';

  const handleReset = useCallback(() => {
    compareStore.clear();
    Haptics.selectionAsync();
    router.back();
  }, [router]);

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!toolA || !toolB) {
    return (
      <SafeAreaView edges={['top']} style={[s.container, { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 }]}>
        <LinearGradient colors={[theme.primary + '25', theme.primary + '08']} style={s.emptyIconBg}>
          <MaterialIcons name="compare" size={56} color={theme.primary} />
        </LinearGradient>
        <Text style={s.emptyTitle}>اختر أداتين للمقارنة</Text>
        <Text style={s.emptySub}>
          {compareIds.length === 1
            ? `تمت إضافة أداة واحدة (${compareIds.length}/2) — ابحث عن أداة ثانية وأضفها للمقارنة`
            : 'اضغط زر "مقارنة" في صفحة أي أداة لإضافتها'}
        </Text>
        <Pressable onPress={() => router.back()} style={[s.primaryBtn, { backgroundColor: theme.primary }]}>
          <MaterialIcons name="arrow-forward" size={16} color="#FFF" />
          <Text style={s.primaryBtnText}>استعراض الأدوات</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Full comparison ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>مقارنة الأدوات</Text>
        <Pressable onPress={handleReset} style={s.headerBtn}>
          <MaterialIcons name="refresh" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Tool header cards ── */}
        <View style={s.toolHeaders}>
          {/* Tool A */}
          <Pressable onPress={() => router.push(`/tool/${toolA.id}` as any)} style={{ flex: 1 }}>
            <LinearGradient colors={[colorA + '35', colorA + '10']} style={s.toolHeader}>
              {overallWinner === 'A' && (
                <View style={[s.winnerBadge, { backgroundColor: colorA }]}>
                  <MaterialIcons name="emoji-events" size={11} color="#FFF" />
                  <Text style={s.winnerBadgeText}>الفائز</Text>
                </View>
              )}
              <View style={[s.toolLogoLg, { backgroundColor: toolA.logoColor + '25' }]}>
                <MaterialIcons name={toolA.logoIcon as any} size={30} color={toolA.logoColor} />
              </View>
              <Text style={[s.toolHeaderName, { color: theme.textPrimary }]} numberOfLines={1}>{toolA.name}</Text>
              <Text style={[s.winsText, { color: colorA }]}>{winsA}</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Cairo_500Medium', color: theme.textMuted }}>انتصارات</Text>
              <Pressable
                onPress={() => { compareStore.remove(toolA.id); Haptics.selectionAsync(); }}
                style={s.removeBtn}
              >
                <MaterialIcons name="close" size={13} color={theme.textMuted} />
              </Pressable>
            </LinearGradient>
          </Pressable>

          {/* VS */}
          <View style={s.vsWrap}>
            <LinearGradient colors={[theme.primary, '#8B5CF6']} style={s.vsBadge}>
              <Text style={s.vsText}>VS</Text>
            </LinearGradient>
          </View>

          {/* Tool B */}
          <Pressable onPress={() => router.push(`/tool/${toolB.id}` as any)} style={{ flex: 1 }}>
            <LinearGradient colors={[colorB + '35', colorB + '10']} style={s.toolHeader}>
              {overallWinner === 'B' && (
                <View style={[s.winnerBadge, { backgroundColor: colorB }]}>
                  <MaterialIcons name="emoji-events" size={11} color="#FFF" />
                  <Text style={s.winnerBadgeText}>الفائز</Text>
                </View>
              )}
              <View style={[s.toolLogoLg, { backgroundColor: toolB.logoColor + '25' }]}>
                <MaterialIcons name={toolB.logoIcon as any} size={30} color={toolB.logoColor} />
              </View>
              <Text style={[s.toolHeaderName, { color: theme.textPrimary }]} numberOfLines={1}>{toolB.name}</Text>
              <Text style={[s.winsText, { color: colorB }]}>{winsB}</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Cairo_500Medium', color: theme.textMuted }}>انتصارات</Text>
              <Pressable
                onPress={() => { compareStore.remove(toolB.id); Haptics.selectionAsync(); }}
                style={s.removeBtn}
              >
                <MaterialIcons name="close" size={13} color={theme.textMuted} />
              </Pressable>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── Score summary ── */}
        <Animated.View entering={FadeInDown.duration(350)} style={[s.scoreSummary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[s.scoreNum, { color: colorA }]}>{winsA}</Text>
            <Text style={[s.scoreName, { color: theme.textMuted }]} numberOfLines={1}>{toolA.name}</Text>
          </View>
          <View style={s.scoreDivider}>
            <Text style={[s.scoreLabel, { color: theme.textMuted }]}>إجمالي النقاط</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[s.scoreNum, { color: colorB }]}>{winsB}</Text>
            <Text style={[s.scoreName, { color: theme.textMuted }]} numberOfLines={1}>{toolB.name}</Text>
          </View>
        </Animated.View>

        {/* ── Comparison rows ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>المقارنة التفصيلية</Text>
          {rows.map((row, idx) => {
            const isWinA = row.winner === 'A';
            const isWinB = row.winner === 'B';
            return (
              <Animated.View
                key={row.label}
                entering={FadeInDown.duration(280).delay(idx * 55)}
                style={[s.compareRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                {/* Cell A */}
                <View style={[s.cellA, isWinA && { backgroundColor: colorA + '12' }]}>
                  {isWinA && <MaterialIcons name="check-circle" size={13} color={colorA} />}
                  <Text style={[s.cellValue, { color: isWinA ? colorA : theme.textSecondary, flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                    {row.valA}
                  </Text>
                </View>

                {/* Label */}
                <View style={[s.rowLabel, { backgroundColor: row.color + '15' }]}>
                  <MaterialIcons name={row.icon as any} size={13} color={row.color} />
                  <Text style={[s.rowLabelText, { color: row.color }]} numberOfLines={1}>{row.label}</Text>
                </View>

                {/* Cell B */}
                <View style={[s.cellB, isWinB && { backgroundColor: colorB + '12' }]}>
                  <Text style={[s.cellValue, { color: isWinB ? colorB : theme.textSecondary, flex: 1, textAlign: 'left' }]} numberOfLines={2}>
                    {row.valB}
                  </Text>
                  {isWinB && <MaterialIcons name="check-circle" size={13} color={colorB} />}
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Tags comparison ── */}
        <Animated.View entering={FadeInDown.duration(350).delay(400)} style={s.section}>
          <Text style={s.sectionTitle}>الوسوم</Text>
          <View style={[s.tagsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1, gap: 5, alignItems: 'flex-end' }}>
              {toolA.tags.slice(0, 5).map(tag => (
                <View key={tag} style={[s.tag, { backgroundColor: colorA + '18', borderColor: colorA + '35' }]}>
                  <Text style={[s.tagText, { color: colorA }]}>#{tag}</Text>
                </View>
              ))}
            </View>
            <View style={[s.tagsDivider, { backgroundColor: theme.border }]} />
            <View style={{ flex: 1, gap: 5, alignItems: 'flex-start' }}>
              {toolB.tags.slice(0, 5).map(tag => (
                <View key={tag} style={[s.tag, { backgroundColor: colorB + '18', borderColor: colorB + '35' }]}>
                  <Text style={[s.tagText, { color: colorB }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Add another tool CTA ── */}
        <View style={{ marginHorizontal: 16 }}>
          <Pressable
            onPress={() => { compareStore.clear(); router.back(); }}
            style={[s.resetBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <MaterialIcons name="swap-horiz" size={18} color={theme.textSecondary} />
            <Text style={[s.resetBtnText, { color: theme.textSecondary }]}>مقارنة أدوات مختلفة</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border,
  },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Cairo_700Bold', color: theme.textPrimary, textAlign: 'center' },

  // Tool headers
  toolHeaders: { flexDirection: 'row', padding: 16, gap: 10 },
  toolHeader: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 5, position: 'relative', minHeight: 160 },
  winnerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999,
  },
  winnerBadgeText: { fontSize: 9, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  toolLogoLg: { width: 56, height: 56, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  toolHeaderName: { fontSize: 13, fontFamily: 'Cairo_700Bold', textAlign: 'center' },
  winsText: { fontSize: 32, fontFamily: 'Cairo_700Bold' },
  removeBtn: {
    position: 'absolute', top: 8, left: 8,
    width: 22, height: 22, borderRadius: 11, backgroundColor: theme.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },

  vsWrap: { justifyContent: 'center', alignItems: 'center' },
  vsBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  vsText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#FFF' },

  // Score summary
  scoreSummary: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginBottom: 20, borderRadius: 14, borderWidth: 1, padding: 16,
  },
  scoreNum: { fontSize: 32, fontFamily: 'Cairo_700Bold' },
  scoreName: { fontSize: 10, fontFamily: 'Cairo_500Medium', textAlign: 'center', maxWidth: 80 },
  scoreDivider: { alignItems: 'center', paddingHorizontal: 12 },
  scoreLabel: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },

  // Comparison rows
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: theme.textPrimary, marginBottom: 10 },
  compareRow: {
    flexDirection: 'row', alignItems: 'stretch',
    borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'hidden',
  },
  cellA: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, padding: 11, justifyContent: 'flex-end' },
  cellB: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, padding: 11, justifyContent: 'flex-start' },
  cellValue: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  rowLabel: {
    alignItems: 'center', justifyContent: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 11, minWidth: 76,
  },
  rowLabelText: { fontSize: 9, fontFamily: 'Cairo_600SemiBold', textAlign: 'center' },

  // Tags
  tagsRow: { flexDirection: 'row', padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  tagsDivider: { width: 1 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, borderWidth: 1 },
  tagText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },

  // Reset
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 12, borderWidth: 1,
  },
  resetBtnText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },

  // Empty state
  emptyIconBg: { width: 110, height: 110, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: theme.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
