import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth, useAlert } from '@/template';
import { submitReport, fetchMyReports, REPORT_TYPES, REPORT_REASONS, REPORT_STATUS_LABELS, Report } from '../services/reportsService';

type ReportView = 'new' | 'my-reports';

export default function ReportsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [view, setView] = useState<ReportView>('new');
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportsLoaded, setReportsLoaded] = useState(false);

  // Form
  const [type, setType] = useState(REPORT_TYPES[0].id);
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReports = useCallback(async () => {
    if (!user?.id || reportsLoaded) return;
    setLoading(true);
    const data = await fetchMyReports(user.id);
    setMyReports(data);
    setReportsLoaded(true);
    setLoading(false);
  }, [user?.id, reportsLoaded]);

  const handleSubmit = useCallback(async () => {
    if (!reason) { showAlert('اختر سبب البلاغ'); return; }
    if (!user?.id) { showAlert('يجب تسجيل الدخول'); return; }
    setSubmitting(true);
    const report = await submitReport(user.id, type, targetId || 'general', reason, description);
    setSubmitting(false);
    if (report) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMyReports(prev => [report, ...prev]);
      setReportsLoaded(true);
      setTargetId(''); setReason(''); setDescription(''); setType(REPORT_TYPES[0].id);
      setView('my-reports');
      showAlert('تم إرسال البلاغ', 'شكراً. سيتم مراجعة بلاغك في أقرب وقت ممكن.');
    } else {
      showAlert('خطأ', 'حدث خطأ في إرسال البلاغ');
    }
  }, [reason, type, targetId, description, user?.id, showAlert]);

  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={s.title}>الإبلاغ</Text>
          <Text style={s.sub}>ساعدنا في الحفاظ على بيئة آمنة</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {[{ id: 'new', label: 'بلاغ جديد', icon: 'flag' }, { id: 'my-reports', label: 'بلاغاتي', icon: 'history' }].map(tab => (
          <Pressable key={tab.id} style={[s.tab, view === tab.id && { borderBottomColor: theme.error, borderBottomWidth: 2 }]}
            onPress={() => { Haptics.selectionAsync(); setView(tab.id as ReportView); if (tab.id === 'my-reports') loadReports(); }}>
            <MaterialIcons name={tab.icon as any} size={16} color={view === tab.id ? theme.error : theme.textMuted} />
            <Text style={[s.tabText, { color: view === tab.id ? theme.error : theme.textMuted, fontFamily: view === tab.id ? 'Cairo_700Bold' : 'Cairo_500Medium' }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {view === 'new' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
            {/* Type */}
            <View>
              <Text style={s.label}>نوع البلاغ</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {REPORT_TYPES.map(t => (
                  <Pressable key={t.id} style={[s.chip, type === t.id && { backgroundColor: theme.error + '20', borderColor: theme.error }]}
                    onPress={() => { setType(t.id); Haptics.selectionAsync(); }}>
                    <MaterialIcons name={t.icon as any} size={13} color={type === t.id ? theme.error : theme.textSecondary} />
                    <Text style={[s.chipText, type === t.id && { color: theme.error }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Target */}
            <View>
              <Text style={s.label}>معرّف العنصر (اختياري)</Text>
              <TextInput style={[s.input, { color: theme.textPrimary, borderColor: theme.border }]}
                value={targetId} onChangeText={setTargetId}
                placeholder="مثال: ID الأداة أو التعليق" placeholderTextColor={theme.textMuted}
                textAlign="right" />
            </View>

            {/* Reason */}
            <View>
              <Text style={s.label}>سبب البلاغ *</Text>
              <View style={[s.reasonList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {REPORT_REASONS.map((r, i) => (
                  <Pressable key={i} style={[s.reasonRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }, reason === r && { backgroundColor: theme.error + '08' }]}
                    onPress={() => { setReason(r); Haptics.selectionAsync(); }}>
                    <View style={[s.radio, reason === r && { backgroundColor: theme.error, borderColor: theme.error }]}>
                      {reason === r && <View style={s.radioDot} />}
                    </View>
                    <Text style={[s.reasonText, { color: theme.textPrimary }, reason === r && { color: theme.error }]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Description */}
            <View>
              <Text style={s.label}>تفاصيل إضافية (اختياري)</Text>
              <TextInput style={[s.textarea, { color: theme.textPrimary, borderColor: theme.border }]}
                value={description} onChangeText={setDescription}
                placeholder="أي تفاصيل إضافية..." placeholderTextColor={theme.textMuted}
                multiline textAlign="right" textAlignVertical="top" />
            </View>

            <Pressable onPress={handleSubmit} disabled={submitting || !reason}
              style={[s.submitBtn, { backgroundColor: theme.error, opacity: (!reason || submitting) ? 0.5 : 1 }]}>
              {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialIcons name="flag" size={18} color="#FFF" />}
              <Text style={s.submitText}>إرسال البلاغ</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
          ) : myReports.length === 0 ? (
            <View style={s.emptyBox}>
              <MaterialIcons name="flag-outlined" size={52} color={theme.textMuted} />
              <Text style={s.emptyTitle}>لا توجد بلاغات</Text>
            </View>
          ) : (
            myReports.map((report, i) => {
              const statusInfo = REPORT_STATUS_LABELS[report.status] || { label: 'قيد المراجعة', color: '#F59E0B' };
              const typeInfo = REPORT_TYPES.find(t => t.id === report.type);
              return (
                <Animated.View key={report.id} entering={FadeInDown.duration(260).delay(i * 40)}
                  style={[s.reportCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {typeInfo && <MaterialIcons name={typeInfo.icon as any} size={14} color={theme.textMuted} />}
                      <Text style={[s.reportType, { color: theme.textSecondary }]}>{typeInfo?.label || report.type}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                      <Text style={[s.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                  </View>
                  <Text style={[s.reportReason, { color: theme.textPrimary }]}>{report.reason}</Text>
                  {report.description && (
                    <Text style={[s.reportDesc, { color: theme.textMuted }]} numberOfLines={2}>{report.description}</Text>
                  )}
                  <Text style={[s.reportDate, { color: theme.textMuted }]}>
                    {new Date(report.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </Animated.View>
              );
            })
          )}
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
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13 },
  label: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
  chipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  input: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Cairo_400Regular' },
  reasonList: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' },
  reasonText: { flex: 1, fontSize: 14, fontFamily: 'Cairo_500Medium', textAlign: 'right' },
  textarea: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Cairo_400Regular', minHeight: 90 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  submitText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  reportCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12 },
  reportType: { fontSize: 12, fontFamily: 'Cairo_500Medium' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  statusText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  reportReason: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'right' },
  reportDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', textAlign: 'right', marginTop: 4 },
  reportDate: { fontSize: 10, fontFamily: 'Cairo_400Regular', marginTop: 8 },
});
