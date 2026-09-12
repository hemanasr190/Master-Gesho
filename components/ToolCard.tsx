import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInUp, useSharedValue, useAnimatedStyle,
  withSpring, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { Tool } from '../services/mockData';
import { useAppContext } from '../contexts/AppContext';

// ── Helpers ────────────────────────────────────────────────────────────────────
function getRatingColor(r: number) {
  if (r >= 4.5) return '#22C55E';
  if (r >= 3.5) return '#3B82F6';
  if (r >= 2.5) return '#F59E0B';
  return '#EF4444';
}

// ── Rating Progress Bar ────────────────────────────────────────────────────────
function RatingBar({ rating }: { rating: number }) {
  const color = getRatingColor(rating);
  const pct = Math.min(100, Math.max(0, (rating / 5) * 100));
  const barW = useSharedValue(0);
  useEffect(() => { barW.value = withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) }); }, [pct]);
  const animStyle = useAnimatedStyle(() => ({ width: `${barW.value}%` as any }));
  return (
    <View style={{ height: 3, backgroundColor: color + '25', width: '100%' }}>
      <Animated.View style={[{ height: 3, backgroundColor: color }, animStyle]} />
    </View>
  );
}

// ── Tool Badges ────────────────────────────────────────────────────────────────
function ToolBadge({ tool }: { tool: Tool }) {
  if (tool.trending) return (
    <View style={[badge.wrap, { backgroundColor: '#EF444420' }]}>
      <MaterialIcons name="local-fire-department" size={9} color="#EF4444" />
      <Text style={[badge.text, { color: '#EF4444' }]}>رائج</Text>
    </View>
  );
  if (tool.editorPick) return (
    <View style={[badge.wrap, { backgroundColor: '#8B5CF620' }]}>
      <MaterialIcons name="verified" size={9} color="#8B5CF6" />
      <Text style={[badge.text, { color: '#8B5CF6' }]}>اختيار المحرر</Text>
    </View>
  );
  if (tool.isNew) return (
    <View style={[badge.wrap, { backgroundColor: '#22C55E20' }]}>
      <MaterialIcons name="fiber-new" size={9} color="#22C55E" />
      <Text style={[badge.text, { color: '#22C55E' }]}>جديد</Text>
    </View>
  );
  return null;
}
const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 },
  text: { fontSize: 9, fontFamily: 'Cairo_700Bold' },
});

// ── Main Component ─────────────────────────────────────────────────────────────
interface ToolCardProps {
  tool: Tool;
  variant?: 'horizontal' | 'vertical' | 'compact';
  width?: number;
  index?: number;
  onLongPress?: () => void;
}

function ToolCardInner({ tool, variant = 'vertical', width, index = 0, onLongPress }: ToolCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { toggleSaveTool, toggleVoteTool, isToolSaved, isToolVoted } = useAppContext();
  const saved = isToolSaved(tool.id);
  const voted = isToolVoted(tool.id);

  const cardScale = useSharedValue(1);
  const voteScale = useSharedValue(1);
  const saveScale = useSharedValue(1);

  const cardAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const voteAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: voteScale.value }] }));
  const saveAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));

  // +١ float animation
  const plusY = useSharedValue(0);
  const plusOpacity = useSharedValue(0);
  const prevVoted = useRef(voted);
  const [showPlus, setShowPlus] = useState(false);

  useEffect(() => {
    if (!prevVoted.current && voted) {
      setShowPlus(true);
      plusOpacity.value = withTiming(1, { duration: 80 });
      plusY.value = withTiming(-38, { duration: 900, easing: Easing.out(Easing.cubic) });
      const t = setTimeout(() => {
        plusOpacity.value = withTiming(0, { duration: 300 });
        setTimeout(() => { setShowPlus(false); plusY.value = 0; plusOpacity.value = 0; }, 320);
      }, 650);
      return () => clearTimeout(t);
    }
    prevVoted.current = voted;
  }, [voted]);

  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: plusY.value }],
    opacity: plusOpacity.value,
  }));

  const doNavigate = useCallback(() => router.push(`/tool/${tool.id}`), [router, tool.id]);
  const handlePressIn = useCallback(() => { cardScale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }, []);
  const handlePressOut = useCallback(() => { cardScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }, []);
  const handlePress = useCallback(() => { Haptics.selectionAsync(); doNavigate(); }, [doNavigate]);

  const handleSave = useCallback((e: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveScale.value = withSequence(
      withSpring(1.45, { damping: 8, stiffness: 400 }),
      withSpring(0.85, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );
    toggleSaveTool(tool.id);
  }, [tool.id, toggleSaveTool]);

  const handleVote = useCallback((e: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    voteScale.value = withSequence(
      withSpring(1.35, { damping: 8, stiffness: 400 }),
      withSpring(0.85, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );
    toggleVoteTool(tool.id);
  }, [tool.id, toggleVoteTool]);

  const enterDelay = Math.min(index * 60, 400);
  const catColor = theme.categoryColors[tool.category] || theme.primary;
  const s = useMemo(() => createStyles(theme), [theme]);

  // ── Compact ──────────────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <Animated.View
        entering={FadeInUp.delay(enterDelay).duration(400).springify().damping(14)}
        style={[{ width: width || 160 }, cardAnimStyle]}
      >
        <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}
          onLongPress={onLongPress} style={[s.compactCard, { overflow: 'hidden' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <LinearGradient colors={[tool.logoColor + '35', tool.logoColor + '10']} style={s.logoSmall}>
              <MaterialIcons name={tool.logoIcon as any} size={20} color={tool.logoColor} />
            </LinearGradient>
            <Animated.View style={saveAnimStyle}>
              <Pressable onPress={handleSave} hitSlop={8}>
                <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={16}
                  color={saved ? theme.primary : theme.textMuted} />
              </Pressable>
            </Animated.View>
          </View>
          <ToolBadge tool={tool} />
          <Text style={s.compactName} numberOfLines={1}>{tool.name}</Text>
          <Text style={s.compactCategory} numberOfLines={1}>{tool.category}</Text>
          <View style={s.compactFooter}>
            <MaterialIcons name="star" size={12} color={theme.star} />
            <Text style={s.compactRating}>{tool.rating}</Text>
            <View style={{ flex: 1 }} />
            <Animated.View style={voteAnimStyle}>
              <Pressable onPress={handleVote} hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <MaterialIcons name="arrow-upward" size={11}
                  color={voted ? theme.upvote : theme.textMuted} />
                <Text style={[s.compactVoteText, voted && { color: theme.upvote }]}>{tool.votes}</Text>
              </Pressable>
            </Animated.View>
          </View>
          {/* Rating bar */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <RatingBar rating={tool.rating} />
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // ── Horizontal ───────────────────────────────────────────────────────────────
  if (variant === 'horizontal') {
    return (
      <Animated.View
        entering={FadeInUp.delay(enterDelay).duration(400).springify().damping(14)}
        style={[{ width: width || 260 }, cardAnimStyle]}
      >
        <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}
          onLongPress={onLongPress} style={s.horizontalCard}>
          {/* Top color strip */}
          <View style={[s.horizontalAccent, { backgroundColor: catColor }]} />

          <View style={s.horizontalTop}>
            <LinearGradient colors={[tool.logoColor + '40', tool.logoColor + '12']} style={s.logoMedium}>
              <MaterialIcons name={tool.logoIcon as any} size={26} color={tool.logoColor} />
            </LinearGradient>
            <View style={{ flex: 1, gap: 3 }}>
              <ToolBadge tool={tool} />
            </View>
            <Animated.View style={voteAnimStyle}>
              <Pressable onPress={handleVote} hitSlop={8}
                style={[s.voteChip, voted && { backgroundColor: theme.upvote, borderColor: theme.upvote }]}>
                <MaterialIcons name="arrow-upward" size={13} color={voted ? '#FFF' : theme.upvote} />
                <Text style={[s.voteChipText, voted && { color: '#FFF' }]}>{tool.votes}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={saveAnimStyle}>
              <Pressable onPress={handleSave} hitSlop={8} style={s.saveBtn}>
                <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={18}
                  color={saved ? theme.primary : theme.textMuted} />
              </Pressable>
            </Animated.View>
          </View>

          <Text style={s.horizontalName} numberOfLines={1}>{tool.name}</Text>
          <Text style={s.horizontalDesc} numberOfLines={2}>{tool.shortDescription}</Text>

          <View style={s.horizontalFooter}>
            <View style={[s.categoryBadge, { backgroundColor: catColor + '20' }]}>
              <Text style={[s.categoryText, { color: catColor }]}>{tool.category}</Text>
            </View>
            <View style={s.ratingRow}>
              <MaterialIcons name="star" size={12} color={theme.star} />
              <Text style={s.ratingText}>{tool.rating}</Text>
            </View>
            <View style={[s.pricingBadge, {
              backgroundColor: tool.pricing === 'مجاني' ? theme.accent + '20' :
                tool.pricing === 'مفتوح المصدر' ? theme.primary + '15' : theme.warning + '20',
            }]}>
              <Text style={[s.pricingText, {
                color: tool.pricing === 'مجاني' ? theme.accent :
                  tool.pricing === 'مفتوح المصدر' ? theme.primary : theme.warning,
              }]}>{tool.pricing}</Text>
            </View>
          </View>

          {/* Rating bar at bottom */}
          <RatingBar rating={tool.rating} />

          {/* +1 float */}
          {showPlus && (
            <Animated.View pointerEvents="none" style={[{
              position: 'absolute', right: 44, top: 44, zIndex: 999,
            }, plusStyle]}>
              <Text style={{ fontSize: 15, fontFamily: 'Cairo_700Bold', color: theme.upvote }}>+١</Text>
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // ── Vertical (default) ───────────────────────────────────────────────────────
  return (
    <Animated.View
      entering={FadeInUp.delay(enterDelay).duration(400).springify().damping(14)}
      style={cardAnimStyle}
    >
      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}
        onLongPress={onLongPress} style={[s.verticalCard, { overflow: 'hidden' }]}>

        <View style={s.verticalRow}>
          <LinearGradient colors={[tool.logoColor + '35', tool.logoColor + '10']} style={s.logoLarge}>
            <MaterialIcons name={tool.logoIcon as any} size={28} color={tool.logoColor} />
          </LinearGradient>

          <View style={s.verticalInfo}>
            <View style={s.verticalHeader}>
              <Text style={s.verticalName} numberOfLines={1}>{tool.name}</Text>
              <ToolBadge tool={tool} />
            </View>
            <Text style={s.verticalDesc} numberOfLines={2}>{tool.shortDescription}</Text>
            <View style={s.verticalMeta}>
              <View style={[s.categoryBadge, { backgroundColor: catColor + '20' }]}>
                <Text style={[s.categoryText, { color: catColor }]}>{tool.category}</Text>
              </View>
              <View style={s.ratingRow}>
                <MaterialIcons name="star" size={13} color={theme.star} />
                <Text style={s.ratingText}>{tool.rating}</Text>
                <Text style={s.ratingCount}>({tool.ratingCount})</Text>
              </View>
              <View style={[s.pricingBadge, {
                backgroundColor: tool.pricing === 'مجاني' ? theme.accent + '20' :
                  tool.pricing === 'مفتوح المصدر' ? theme.primary + '15' : theme.warning + '20',
              }]}>
                <Text style={[s.pricingText, {
                  color: tool.pricing === 'مجاني' ? theme.accent :
                    tool.pricing === 'مفتوح المصدر' ? theme.primary : theme.warning,
                }]}>{tool.pricing}</Text>
              </View>
            </View>
          </View>

          <View style={[s.verticalActions, { position: 'relative' }]}>
            <Animated.View style={voteAnimStyle}>
              <Pressable onPress={handleVote} hitSlop={8}
                style={[s.voteButton, voted && { backgroundColor: theme.upvote, borderColor: theme.upvote }]}>
                <MaterialIcons name="arrow-upward" size={18} color={voted ? '#FFF' : theme.upvote} />
                <Text style={[s.voteText, voted && { color: '#FFF' }]}>{tool.votes}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={saveAnimStyle}>
              <Pressable onPress={handleSave} hitSlop={8}>
                <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={22}
                  color={saved ? theme.primary : theme.textMuted} />
              </Pressable>
            </Animated.View>
            {/* +1 float */}
            {showPlus && (
              <Animated.View pointerEvents="none" style={[{
                position: 'absolute', top: -8, right: 8, zIndex: 999,
              }, plusStyle]}>
                <Text style={{ fontSize: 15, fontFamily: 'Cairo_700Bold', color: theme.upvote }}>+١</Text>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Rating bar at bottom */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <RatingBar rating={tool.rating} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const ToolCard = React.memo(ToolCardInner);
export default ToolCard;

const createStyles = (theme: any) => StyleSheet.create({
  compactCard: {
    backgroundColor: theme.surface, borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: theme.border, paddingBottom: 16,
  },
  logoSmall: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  compactName: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: theme.textPrimary, marginBottom: 2, textAlign: 'right', marginTop: 4 },
  compactCategory: { fontSize: 10, fontFamily: 'Cairo_500Medium', color: theme.textMuted, marginBottom: 8, textAlign: 'right' },
  compactFooter: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  compactRating: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: theme.star },
  compactVoteText: { fontSize: 10, fontFamily: 'Cairo_500Medium', color: theme.textMuted },

  horizontalCard: {
    backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1,
    borderColor: theme.border, overflow: 'hidden',
  },
  horizontalAccent: { height: 3 },
  horizontalTop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 8 },
  logoMedium: { width: 48, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  voteChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9999,
    borderWidth: 1.5, borderColor: theme.upvote,
  },
  voteChipText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: theme.upvote },
  saveBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  horizontalName: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: theme.textPrimary, paddingHorizontal: 13, marginBottom: 3, textAlign: 'right' },
  horizontalDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.textSecondary, lineHeight: 17, paddingHorizontal: 13, marginBottom: 10, textAlign: 'right' },
  horizontalFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingBottom: 10, flexWrap: 'wrap' },

  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  categoryText: { fontSize: 10, fontFamily: 'Cairo_500Medium' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: theme.star },
  ratingCount: { fontSize: 10, fontFamily: 'Cairo_500Medium', color: theme.textMuted },
  pricingBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9999 },
  pricingText: { fontSize: 10, fontFamily: 'Cairo_500Medium' },

  verticalCard: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 14,
    paddingBottom: 18, borderWidth: 1, borderColor: theme.border,
  },
  verticalRow: { flexDirection: 'row', gap: 12 },
  logoLarge: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  verticalInfo: { flex: 1, minWidth: 0 },
  verticalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  verticalName: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: theme.textPrimary, flex: 1, textAlign: 'right' },
  verticalDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.textSecondary, lineHeight: 18, marginBottom: 8, textAlign: 'right' },
  verticalMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  verticalActions: { alignItems: 'center', gap: 12, flexShrink: 0 },
  voteButton: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 9, borderWidth: 1.5, borderColor: theme.upvote, minWidth: 50,
  },
  voteText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: theme.upvote, marginTop: 1 },
});
