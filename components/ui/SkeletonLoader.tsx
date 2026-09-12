/**
 * SkeletonLoader.tsx — Premium animated shimmer skeleton loading system
 * Replaces all ActivityIndicator spinners for a polished, professional UX
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Base Skeleton Atom ────────────────────────────────────────────────────────
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { theme } = useTheme();
  const shimmerX = useSharedValue(-400);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(400, { duration: 1400, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const base = theme.mode === 'dark' ? '#182238' : '#E8EFF6';
  const highlight = theme.mode === 'dark' ? '#243358' : '#F2F7FD';

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: base,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
        <LinearGradient
          colors={[base, highlight, highlight, base] as any}
          locations={[0, 0.35, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: 800, height: '100%', position: 'absolute', left: -400 }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Pre-built Skeleton Molecules ─────────────────────────────────────────────

export function ToolCardVerticalSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[sk.cardV, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={sk.row}>
        <Skeleton width={52} height={52} borderRadius={14} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="55%" height={15} borderRadius={5} />
          <Skeleton width="90%" height={11} borderRadius={4} />
          <Skeleton width="70%" height={11} borderRadius={4} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            <Skeleton width={68} height={20} borderRadius={9999} />
            <Skeleton width={44} height={20} borderRadius={9999} />
            <Skeleton width={50} height={20} borderRadius={9999} />
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Skeleton width={48} height={38} borderRadius={9} />
          <Skeleton width={22} height={22} borderRadius={11} />
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <Skeleton width="70%" height={3} borderRadius={2} />
      </View>
    </View>
  );
}

export function ToolCardHorizontalSkeleton({ width = 260 }: { width?: number }) {
  const { theme } = useTheme();
  return (
    <View style={[sk.cardH, { width, backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Skeleton width="100%" height={3} borderRadius={0} />
      <View style={{ padding: 13, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Skeleton width={48} height={48} borderRadius={13} />
          <View style={{ flex: 1 }} />
          <Skeleton width={58} height={28} borderRadius={9999} />
          <Skeleton width={30} height={30} borderRadius={15} />
        </View>
        <Skeleton width="70%" height={15} borderRadius={5} />
        <Skeleton width="100%" height={11} borderRadius={4} />
        <Skeleton width="80%" height={11} borderRadius={4} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Skeleton width={64} height={22} borderRadius={9999} />
          <Skeleton width={38} height={22} borderRadius={9999} />
        </View>
      </View>
    </View>
  );
}

export function ToolCardCompactSkeleton({ width = 160 }: { width?: number }) {
  const { theme } = useTheme();
  return (
    <View style={[sk.cardC, { width, backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Skeleton width={38} height={38} borderRadius={10} />
        <Skeleton width={16} height={16} borderRadius={8} />
      </View>
      <Skeleton width="80%" height={13} borderRadius={5} style={{ marginBottom: 5 }} />
      <Skeleton width="55%" height={10} borderRadius={4} style={{ marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Skeleton width={12} height={12} borderRadius={6} />
        <Skeleton width={24} height={11} borderRadius={4} />
        <View style={{ flex: 1 }} />
        <Skeleton width={30} height={11} borderRadius={4} />
      </View>
    </View>
  );
}

// ─── Page-level Skeleton Templates ────────────────────────────────────────────

export function HomeScreenSkeleton() {
  return (
    <View style={{ padding: 16, gap: 20 }}>
      {/* Stats bar */}
      <Skeleton width="100%" height={72} borderRadius={16} />
      {/* Search */}
      <Skeleton width="100%" height={50} borderRadius={14} />
      {/* Trending banner */}
      <Skeleton width="100%" height={44} borderRadius={10} />
      {/* Platform features strip */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[...Array(5)].map((_, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6, width: 68 }}>
            <Skeleton width={52} height={52} borderRadius={15} />
            <Skeleton width={44} height={10} borderRadius={4} />
          </View>
        ))}
      </View>
      {/* Section: Trending Tools */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Skeleton width={32} height={32} borderRadius={9} />
          <Skeleton width="40%" height={20} borderRadius={5} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <ToolCardHorizontalSkeleton width={260} />
          <ToolCardHorizontalSkeleton width={260} />
        </View>
      </View>
      {/* Section: Vertical list */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Skeleton width={32} height={32} borderRadius={9} />
          <Skeleton width="38%" height={20} borderRadius={5} />
        </View>
        <View style={{ gap: 12 }}>
          <ToolCardVerticalSkeleton />
          <ToolCardVerticalSkeleton />
          <ToolCardVerticalSkeleton />
        </View>
      </View>
    </View>
  );
}

export function ExploreScreenSkeleton() {
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <Skeleton width="100%" height={50} borderRadius={14} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[80, 65, 90, 70, 78, 55].map((w, i) => (
          <Skeleton key={i} width={w} height={34} borderRadius={9999} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={60} height={16} borderRadius={5} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[50, 55, 60, 50].map((w, i) => (
            <Skeleton key={i} width={w} height={26} borderRadius={9999} />
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        {[...Array(6)].map((_, i) => <ToolCardVerticalSkeleton key={i} />)}
      </View>
    </View>
  );
}

export function ToolDetailSkeleton() {
  return (
    <View style={{ gap: 20 }}>
      {/* Hero section */}
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 20, paddingHorizontal: 16 }}>
        <Skeleton width={80} height={80} borderRadius={22} />
        <Skeleton width="50%" height={26} borderRadius={8} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Skeleton width={90} height={28} borderRadius={9999} />
          <Skeleton width={65} height={28} borderRadius={9999} />
        </View>
        <Skeleton width="35%" height={14} borderRadius={5} />
      </View>
      {/* Stats bar */}
      <View style={{ marginHorizontal: 16 }}>
        <Skeleton width="100%" height={80} borderRadius={16} />
      </View>
      {/* Actions row */}
      <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 16 }}>
        <Skeleton width="47%" height={52} borderRadius={12} />
        <Skeleton width="47%" height={52} borderRadius={12} />
      </View>
      {/* Description */}
      <View style={{ gap: 8, marginHorizontal: 16 }}>
        <Skeleton width="30%" height={20} borderRadius={6} />
        <Skeleton width="100%" height={14} borderRadius={5} />
        <Skeleton width="95%" height={14} borderRadius={5} />
        <Skeleton width="88%" height={14} borderRadius={5} />
        <Skeleton width="75%" height={14} borderRadius={5} />
        <Skeleton width="60%" height={14} borderRadius={5} />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          {[55, 70, 60, 65].map((w, i) => <Skeleton key={i} width={w} height={24} borderRadius={9999} />)}
        </View>
      </View>
      {/* Screenshots */}
      <View style={{ gap: 10 }}>
        <View style={{ marginHorizontal: 16 }}>
          <Skeleton width="30%" height={20} borderRadius={6} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
          <Skeleton width={280} height={175} borderRadius={12} />
          <Skeleton width={280} height={175} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

export function NotificationsScreenSkeleton() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {[...Array(7)].map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Skeleton width={44} height={44} borderRadius={12} />
          <View style={{ flex: 1, gap: 7 }}>
            <Skeleton width="50%" height={14} borderRadius={5} />
            <Skeleton width="90%" height={11} borderRadius={4} />
            <Skeleton width="75%" height={11} borderRadius={4} />
            <Skeleton width="30%" height={10} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ProfileScreenSkeleton() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 20, gap: 20 }}>
      <Skeleton width={80} height={80} borderRadius={40} />
      <Skeleton width="40%" height={20} borderRadius={6} />
      <Skeleton width="55%" height={14} borderRadius={5} />
      <Skeleton width={160} height={32} borderRadius={9999} />
      <View style={{ flexDirection: 'row', gap: 12, width: '100%', paddingHorizontal: 16, marginTop: 8 }}>
        {[...Array(3)].map((_, i) => (
          <View key={i} style={{ flex: 1, gap: 8, alignItems: 'center' }}>
            <Skeleton width={36} height={36} borderRadius={10} />
            <Skeleton width="60%" height={20} borderRadius={5} />
            <Skeleton width="80%" height={11} borderRadius={4} />
          </View>
        ))}
      </View>
      <View style={{ width: '100%', paddingHorizontal: 16, gap: 12 }}>
        {[...Array(5)].map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={36} height={36} borderRadius={10} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="55%" height={14} borderRadius={5} />
              <Skeleton width="80%" height={11} borderRadius={4} />
            </View>
            <Skeleton width={18} height={18} borderRadius={9} />
          </View>
        ))}
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  cardV: { borderRadius: 16, padding: 14, borderWidth: 1 },
  cardH: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cardC: { borderRadius: 14, padding: 13, borderWidth: 1 },
});
