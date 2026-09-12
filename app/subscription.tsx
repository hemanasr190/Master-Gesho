import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '@/template';

const PLANS = [
  {
    id: 'free',
    name: 'مجاني',
    price: 0,
    period: 'للأبد',
    color: '#6B7280',
    icon: '🌱',
    features: [
      'استعراض جميع الأدوات',
      'حفظ حتى 10 أدوات',
      '5 تعليقات يومياً',
      '5 صور AI شهرياً',
      '20 رسالة AI شهرياً',
      'دعم عبر البريد',
    ],
    isCurrent: true,
  },
  {
    id: 'pro',
    name: 'برو',
    price: 49,
    period: 'شهرياً',
    yearlyPrice: 399,
    color: '#3B82F6',
    icon: '⚡',
    badge: 'الأكثر شيوعاً',
    features: [
      'كل مزايا المجاني',
      'حفظ غير محدود',
      'تعليقات غير محدودة',
      '100 صورة AI شهرياً',
      '500 رسالة AI شهرياً',
      'دعم أولوي 24/7',
      'بدون إعلانات',
      'شارة المحترف ⚡',
    ],
    isCurrent: false,
  },
  {
    id: 'enterprise',
    name: 'المؤسسات',
    price: 199,
    period: 'شهرياً',
    yearlyPrice: 1599,
    color: '#8B5CF6',
    icon: '👑',
    badge: 'للشركات',
    features: [
      'كل مزايا برو',
      'مستخدمون غير محدودون',
      'API وصول كامل',
      'لوحة تحكم مخصصة',
      'مدير حساب مخصص',
      'تقارير متقدمة',
      'SLA مضمون 99.9%',
      'شارة المؤسسة 👑',
    ],
    isCurrent: false,
  },
];

const FAQ_SUB = [
  { q: 'هل يمكنني الإلغاء في أي وقت؟', a: 'نعم، يمكنك إلغاء اشتراكك في أي وقت. ستستمر في الاستمتاع بالمزايا حتى نهاية فترة الاشتراك.' },
  { q: 'هل تدعمون الدفع بالعملات العربية؟', a: 'نعم، ندعم الدفع بالريال السعودي، الدرهم الإماراتي، والجنيه المصري.' },
  { q: 'ما طرق الدفع المتاحة؟', a: 'نقبل Visa، Mastercard، Apple Pay، Google Pay، وبطاقات مدى.' },
  { q: 'هل هناك نسخة تجريبية مجانية للخطط المدفوعة؟', a: 'نعم! نقدم 14 يوماً تجريبية مجانية لخطة برو بدون الحاجة لبيانات بنكية.' },
];

export default function SubscriptionScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [billingPeriod, setBillingPeriod] = React.useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = (planId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert(
      'قريباً',
      'نظام الدفع قيد التطوير. سيتم تفعيله قريباً مع دعم جميع طرق الدفع المحلية والعالمية.',
      [{ text: 'حسناً', style: 'default' }]
    );
  };

  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={s.title}>الاشتراكات</Text>
          <Text style={s.sub}>اختر الخطة المناسبة لك</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* Billing toggle */}
        <Animated.View entering={FadeInDown.duration(300)} style={s.billingToggle}>
          <Pressable style={[s.billingBtn, billingPeriod === 'monthly' && { backgroundColor: theme.primary }]}
            onPress={() => { setBillingPeriod('monthly'); Haptics.selectionAsync(); }}>
            <Text style={[s.billingText, billingPeriod === 'monthly' && { color: '#FFF' }]}>شهري</Text>
          </Pressable>
          <Pressable style={[s.billingBtn, billingPeriod === 'yearly' && { backgroundColor: theme.primary }]}
            onPress={() => { setBillingPeriod('yearly'); Haptics.selectionAsync(); }}>
            <Text style={[s.billingText, billingPeriod === 'yearly' && { color: '#FFF' }]}>سنوي</Text>
            <View style={[s.discountBadge, { backgroundColor: '#22C55E' }]}>
              <Text style={s.discountText}>وفّر 33%</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* Plans */}
        {PLANS.map((plan, i) => (
          <Animated.View key={plan.id} entering={FadeInDown.duration(300).delay(i * 80)} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <View style={[s.planCard, { borderColor: plan.isCurrent ? theme.primary : plan.color + '40', borderWidth: plan.isCurrent ? 2 : 1.5 }]}>
              {plan.isCurrent && (
                <View style={[s.currentBadge, { backgroundColor: theme.primary }]}>
                  <MaterialIcons name="check" size={12} color="#FFF" />
                  <Text style={s.currentText}>خطتك الحالية</Text>
                </View>
              )}
              {plan.badge && !plan.isCurrent && (
                <View style={[s.popularBadge, { backgroundColor: plan.color }]}>
                  <Text style={s.popularText}>{plan.badge}</Text>
                </View>
              )}

              <View style={s.planHeader}>
                <View style={[s.planIconBg, { backgroundColor: plan.color + '15' }]}>
                  <Text style={{ fontSize: 26 }}>{plan.icon}</Text>
                </View>
                <View>
                  <Text style={[s.planName, { color: theme.textPrimary }]}>{plan.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={[s.planPrice, { color: plan.color }]}>
                      {plan.price === 0 ? 'مجاني' : `${billingPeriod === 'yearly' && plan.yearlyPrice ? Math.round(plan.yearlyPrice / 12) : plan.price} ر.س`}
                    </Text>
                    {plan.price > 0 && <Text style={[s.planPeriod, { color: theme.textMuted }]}>/ شهر</Text>}
                  </View>
                  {billingPeriod === 'yearly' && plan.yearlyPrice && (
                    <Text style={[s.yearlyNote, { color: '#22C55E' }]}>{plan.yearlyPrice} ر.س سنوياً</Text>
                  )}
                </View>
              </View>

              <View style={[s.divider, { backgroundColor: theme.border }]} />

              <View style={s.featuresList}>
                {plan.features.map((feature, fi) => (
                  <View key={fi} style={s.featureRow}>
                    <MaterialIcons name="check-circle" size={16} color={plan.color} />
                    <Text style={[s.featureText, { color: theme.textSecondary }]}>{feature}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => !plan.isCurrent && handleUpgrade(plan.id)}
                disabled={plan.isCurrent}
                style={plan.isCurrent
                  ? [s.actionBtn, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]
                  : [s.actionBtn, { backgroundColor: plan.color }]}
              >
                <Text style={[s.actionBtnText, { color: plan.isCurrent ? theme.textMuted : '#FFF' }]}>
                  {plan.isCurrent ? 'خطتك الحالية' : plan.price === 0 ? 'البدء مجاناً' : 'الترقية الآن'}
                </Text>
                {!plan.isCurrent && <MaterialIcons name="arrow-forward" size={16} color="#FFF" />}
              </Pressable>
            </View>
          </Animated.View>
        ))}

        {/* Payment methods */}
        <Animated.View entering={FadeInDown.duration(300).delay(280)} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={[s.paySection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[s.paySectionTitle, { color: theme.textPrimary }]}>طرق الدفع المدعومة</Text>
            <View style={s.payMethods}>
              {['Visa', 'Mastercard', 'Apple Pay', 'Google Pay', 'مدى', 'فوري', 'فودافون كاش'].map(method => (
                <View key={method} style={[s.payBadge, { backgroundColor: theme.backgroundSecondary }]}>
                  <Text style={[s.payBadgeText, { color: theme.textSecondary }]}>{method}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* FAQ */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[s.faqTitle, { color: theme.textPrimary }]}>أسئلة شائعة</Text>
          {FAQ_SUB.map((item, i) => (
            <Animated.View key={i} entering={FadeInDown.duration(280).delay(i * 50)}
              style={[s.faqItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.faqQ, { color: theme.textPrimary }]}>{item.q}</Text>
              <Text style={[s.faqA, { color: theme.textSecondary }]}>{item.a}</Text>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: t.textPrimary },
  sub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: t.textMuted, marginTop: 1 },
  billingToggle: { flexDirection: 'row', margin: 16, marginBottom: 8, backgroundColor: t.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: t.border },
  billingBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9 },
  billingText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  discountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 },
  discountText: { fontSize: 9, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  planCard: { backgroundColor: t.surface, borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' },
  currentBadge: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  currentText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  popularBadge: { position: 'absolute', top: 16, left: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  popularText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16, marginTop: 8 },
  planIconBg: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  planName: { fontSize: 20, fontFamily: 'Cairo_700Bold' },
  planPrice: { fontSize: 28, fontFamily: 'Cairo_700Bold' },
  planPeriod: { fontSize: 13, fontFamily: 'Cairo_400Regular' },
  yearlyNote: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', marginTop: 2 },
  divider: { height: 1, marginBottom: 16 },
  featuresList: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, fontFamily: 'Cairo_400Regular' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnText: { fontSize: 16, fontFamily: 'Cairo_700Bold' },
  paySection: { borderRadius: 16, padding: 16, borderWidth: 1 },
  paySectionTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', marginBottom: 12 },
  payMethods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  payBadgeText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  faqTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', marginBottom: 12 },
  faqItem: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10, gap: 8 },
  faqQ: { fontSize: 14, fontFamily: 'Cairo_700Bold', textAlign: 'right' },
  faqA: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 20, textAlign: 'right' },
});
