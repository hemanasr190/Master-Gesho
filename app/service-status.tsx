import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import {
  fetchServiceStatuses, fetchRecentIncidents, getOverallStatus,
  STATUS_COLORS, STATUS_LABELS, STATUS_ICONS, ServiceItem, Incident,
} from '../services/statusService';

function ServiceCard({ service, theme, index }: { service: ServiceItem; theme: any; index: number }) {
  const color = STATUS_COLORS[service.status];
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(index * 45)}
      style={[sc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[sc.iconBox, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={service.icon as any} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sc.name, { color: theme.textPrimary }]}>{service.name}</Text>
        <Text style={[sc.desc, { color: theme.textMuted }]}>{service.description}</Text>
        {service.latency && (
          <Text style={[sc.latency, { color: theme.textMuted }]}>زمن الاستجابة: {service.latency}ms</Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[sc.statusDot, { backgroundColor: color }]} />
        <Text style={[sc.uptime, { color: theme.textMuted }]}>{service.uptime}%</Text>
      </View>
    </Animated.View>
  );
}

const sc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name: { fontSize: 14, fontFamily: 'Cairo_700Bold', marginBottom: 2 },
  desc: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  latency: { fontSize: 10, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  uptime: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
});

function IncidentCard({ incident, theme }: { incident: Incident; theme: any }) {
  const statusColors = { investigating: '#EF4444', monitoring: '#F59E0B', resolved: '#22C55E' };
  const statusLabels = { investigating: 'قيد التحقيق', monitoring: 'تحت المراقبة', resolved: 'تم الحل' };
  const color = statusColors[incident.status];
  return (
    <View style={[ic.card, { backgroundColor: theme.surface, borderColor: color + '30' }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={[ic.title, { color: theme.textPrimary }]}>{incident.title}</Text>
        <View style={[ic.badge, { backgroundColor: color + '20' }]}>
          <Text style={[ic.badgeText, { color }]}>{statusLabels[incident.status]}</Text>
        </View>
      </View>
      <Text style={[ic.desc, { color: theme.textSecondary }]}>{incident.description}</Text>
      <Text style={[ic.date, { color: theme.textMuted }]}>
        {new Date(incident.startedAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
        {incident.resolvedAt && ` ← ${new Date(incident.resolvedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`}
      </Text>
    </View>
  );
}

const ic = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, borderWidth: 1.5, marginBottom: 10 },
  title: { fontSize: 14, fontFamily: 'Cairo_700Bold', flex: 1 },
  desc: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 20, textAlign: 'right', marginBottom: 8 },
  date: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, marginRight: 8 },
  badgeText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
});

export default function ServiceStatusScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const services = useMemo(() => fetchServiceStatuses(), []);
  const incidents = useMemo(() => fetchRecentIncidents(), []);
  const overall = useMemo(() => getOverallStatus(services), [services]);
  const overallColor = STATUS_COLORS[overall];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise(r => setTimeout(r, 1200));
    setLastUpdated(new Date());
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const operationalCount = services.filter(s => s.status === 'operational').length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={[ss.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={[ss.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={[ss.title, { color: theme.textPrimary }]}>حالة الخدمات</Text>
          <Text style={[ss.sub, { color: theme.textMuted }]}>
            آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Pressable onPress={handleRefresh} style={[ss.refreshBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialIcons name="refresh" size={20} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Status Banner */}
        <Animated.View entering={FadeInDown.duration(350)} style={{ margin: 16 }}>
          <LinearGradient
            colors={[overallColor + '30', overallColor + '10']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[ss.overallBanner, { borderColor: overallColor + '50' }]}
          >
            <Animated.View entering={ZoomIn.springify().damping(14)}>
              <View style={[ss.overallIcon, { backgroundColor: overallColor + '20' }]}>
                <MaterialIcons name={STATUS_ICONS[overall] as any} size={36} color={overallColor} />
              </View>
            </Animated.View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={[ss.overallTitle, { color: overallColor }]}>{STATUS_LABELS[overall]}</Text>
              <Text style={[ss.overallSub, { color: theme.textSecondary }]}>
                {operationalCount} من {services.length} خدمة تعمل بشكل طبيعي
              </Text>
            </View>
            <View style={[ss.overallBadge, { backgroundColor: overallColor + '20', borderColor: overallColor + '40' }]}>
              <View style={[ss.pulseDot, { backgroundColor: overallColor }]} />
              <Text style={[ss.overallBadgeText, { color: overallColor }]}>مباشر</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Uptime Stats */}
        <Animated.View entering={FadeInDown.duration(300).delay(80)} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={[ss.statsBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {[
              { label: 'يعمل', count: services.filter(s => s.status === 'operational').length, color: '#22C55E' },
              { label: 'متدهور', count: services.filter(s => s.status === 'degraded').length, color: '#F59E0B' },
              { label: 'متوقف', count: services.filter(s => s.status === 'outage').length, color: '#EF4444' },
              { label: 'صيانة', count: services.filter(s => s.status === 'maintenance').length, color: '#6B7280' },
            ].map((stat, i) => (
              <View key={i} style={[ss.statItem, i > 0 && { borderRightWidth: 1, borderRightColor: theme.border }]}>
                <Text style={[ss.statVal, { color: stat.color }]}>{stat.count}</Text>
                <Text style={[ss.statLabel, { color: theme.textMuted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Services */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[ss.sectionTitle, { color: theme.textPrimary }]}>الخدمات</Text>
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} theme={theme} index={i} />
          ))}
        </View>

        {/* Incidents */}
        {incidents.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Text style={[ss.sectionTitle, { color: theme.textPrimary }]}>الحوادث الأخيرة</Text>
            {incidents.map(incident => (
              <IncidentCard key={incident.id} incident={incident} theme={theme} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: 'Cairo_700Bold' },
  sub: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 1 },
  refreshBtn: { marginLeft: 'auto', width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  overallBanner: { borderRadius: 20, borderWidth: 1.5, padding: 20, alignItems: 'center', gap: 14 },
  overallIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  overallTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', textAlign: 'center' },
  overallSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', textAlign: 'center' },
  overallBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999, borderWidth: 1 },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  overallBadgeText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  statsBar: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statVal: { fontSize: 20, fontFamily: 'Cairo_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Cairo_500Medium' },
  sectionTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', marginBottom: 12, marginTop: 8 },
});
