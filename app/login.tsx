import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth, useAlert, getSupabaseClient } from '@/template';
import { useTheme } from '../contexts/ThemeContext';

type AuthMode = 'login' | 'register' | 'forgot';

function mapAuthError(error: string): string {
  const e = error.toLowerCase();
  if (e.includes('invalid login credentials') || e.includes('invalid_credentials') || e.includes('invalid email or password'))
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (e.includes('email not confirmed') || e.includes('email_not_confirmed'))
    return 'يرجى تأكيد بريدك الإلكتروني أولاً — تحقق من صندوق الوارد';
  if (e.includes('user already registered') || e.includes('already registered') || e.includes('already been registered'))
    return 'هذا البريد الإلكتروني مسجّل بالفعل — سجّل دخولك أو استرد كلمة المرور';
  if (e.includes('user not found') || e.includes('no user found'))
    return 'لم يتم العثور على حساب بهذا البريد الإلكتروني';
  if (e.includes('signup_disabled') || e.includes('signup disabled'))
    return 'التسجيل غير متاح حالياً';
  if (e.includes('weak_password') || e.includes('password should be at least') || e.includes('password is too short'))
    return 'كلمة المرور ضعيفة — استخدم 6 أحرف أو أكثر';
  if (e.includes('over_request_rate_limit') || e.includes('too many requests') || e.includes('rate limit'))
    return 'محاولات كثيرة جداً — انتظر قليلاً وحاول مجدداً';
  if (e.includes('network') || e.includes('fetch') || e.includes('connection'))
    return 'خطأ في الاتصال بالشبكة — تحقق من اتصالك';
  if (e.includes('invalid format') || e.includes('invalid email') || e.includes('email_address_invalid') || e.includes('unable to validate email'))
    return 'صيغة البريد الإلكتروني غير صحيحة';
  if (e.includes('expired') || e.includes('token has expired'))
    return 'انتهت صلاحية الرابط — يرجى المحاولة مجدداً';
  if (e.includes('password'))
    return 'كلمة المرور غير صحيحة';
  return error;
}

export default function LoginScreen() {
  const { theme } = useTheme();
  const { signUpWithPassword, signInWithPassword, operationLoading } = useAuth();
  const { showAlert } = useAlert();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) showAlert('خطأ', mapAuthError(error));
  }, [email, password, signInWithPassword, showAlert]);

  const handleRegister = useCallback(async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      showAlert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('خطأ', 'كلمتا المرور غير متطابقتين');
      return;
    }
    if (password.length < 6) {
      showAlert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error, needsEmailConfirmation } = await signUpWithPassword(email.trim(), password);
    if (error) {
      showAlert('خطأ', mapAuthError(error));
      return;
    }
    if (needsEmailConfirmation) {
      showAlert('تحقق من بريدك', 'تم إرسال رابط التأكيد إلى بريدك الإلكتروني');
    }
  }, [email, password, confirmPassword, signUpWithPassword, showAlert]);

  const handleForgotPassword = useCallback(async () => {
    if (!email.trim()) {
      showAlert('تنبيه', 'يرجى إدخال بريدك الإلكتروني في الحقل أعلاه أولاً');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setForgotLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        showAlert('خطأ', mapAuthError(error.message));
        return;
      }
      showAlert(
        'تم الإرسال',
        'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. تحقق من صندوق الوارد أو مجلد الرسائل غير المرغوب فيها.',
        [{ text: 'حسناً', onPress: () => setMode('login') }],
      );
    } catch (err: any) {
      showAlert('خطأ', mapAuthError(err?.message || 'حدث خطأ غير متوقع'));
    } finally {
      setForgotLoading(false);
    }
  }, [email, showAlert]);

  const isLoading = operationLoading || forgotLoading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Welcome */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.logoSection}>
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              style={styles.logoCircle}
            >
              <MaterialIcons name="auto-awesome" size={36} color="#FFF" />
            </LinearGradient>
            <Text style={styles.appName}>مستر جيشو</Text>
            <Text style={styles.appTagline}>منصتك العربية لأدوات الذكاء الاصطناعي</Text>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <Text style={styles.title}>
              {mode === 'login' ? 'تسجيل الدخول' : mode === 'register' ? 'حساب جديد' : 'استرداد كلمة المرور'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'أدخل بياناتك للوصول لحسابك'
                : mode === 'register'
                  ? 'أنشئ حساباً جديداً للبدء'
                  : 'سنرسل رابط إعادة التعيين إلى بريدك الإلكتروني'}
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.form}>

            {/* Email field — always visible */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color={theme.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>
            </View>

            {/* Password field — hidden in forgot mode */}
            {mode !== 'forgot' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>كلمة المرور</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock" size={20} color={theme.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••"
                    placeholderTextColor={theme.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textAlign="right"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={theme.textMuted} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Forgot password link — login mode only */}
            {mode === 'login' && (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setMode('forgot'); }}
                style={styles.forgotBtn}
              >
                <MaterialIcons name="lock-reset" size={14} color={theme.primary} />
                <Text style={styles.forgotBtnText}>نسيت كلمة المرور؟</Text>
              </Pressable>
            )}

            {/* Confirm password — register mode only */}
            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>تأكيد كلمة المرور</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock-outline" size={20} color={theme.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••"
                    placeholderTextColor={theme.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    textAlign="right"
                  />
                </View>
              </View>
            )}

            {/* Forgot mode info box */}
            {mode === 'forgot' && (
              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={16} color={theme.primary} />
                <Text style={styles.infoBoxText}>
                  أدخل بريدك الإلكتروني المسجّل وسنرسل لك رابطاً لإعادة تعيين كلمة المرور خلال دقيقة.
                </Text>
              </View>
            )}

            {/* Primary Button */}
            <Pressable
              onPress={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleForgotPassword}
              disabled={isLoading}
              style={{ borderRadius: 14, overflow: 'hidden', marginTop: 8 }}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryButton, isLoading && { opacity: 0.6 }]}
              >
                {isLoading ? (
                  <Text style={styles.primaryButtonText}>جارٍ التحميل...</Text>
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'login' ? 'دخول' : mode === 'register' ? 'إنشاء حساب' : 'إرسال رابط الاسترداد'}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Switch Mode */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>
                {mode === 'login'
                  ? 'ليس لديك حساب؟'
                  : mode === 'register'
                    ? 'لديك حساب بالفعل؟'
                    : 'تذكرت كلمة المرور؟'}
              </Text>
              <Pressable onPress={() => {
                Haptics.selectionAsync();
                setMode(mode === 'login' ? 'register' : 'login');
              }}>
                <Text style={styles.switchLink}>
                  {mode === 'login' ? 'سجّل الآن' : 'سجّل دخول'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Footer */}
          <Text style={styles.footer}>© 2026 منصة مستر جيشو</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 40 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  appName: { fontSize: 28, fontWeight: '800', fontFamily: 'Cairo_700Bold', color: theme.textPrimary },
  appTagline: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.textMuted, marginTop: 4 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: 'Cairo_700Bold', color: theme.textPrimary, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.textSecondary, textAlign: 'center', marginBottom: 28 },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: theme.textSecondary, textAlign: 'right' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 52,
    backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: theme.border,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'Cairo_400Regular', color: theme.textPrimary, writingDirection: 'rtl' },
  forgotBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-end', paddingVertical: 4, marginTop: -6,
  },
  forgotBtnText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: theme.primary },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: theme.primary + '12', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: theme.primary + '30',
  },
  infoBoxText: {
    flex: 1, fontSize: 13, fontFamily: 'Cairo_400Regular',
    color: theme.textSecondary, lineHeight: 20, textAlign: 'right',
  },
  primaryButton: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 17, fontWeight: '700', fontFamily: 'Cairo_700Bold', color: '#FFF' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 },
  switchText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.textMuted },
  switchLink: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: theme.primary },
  footer: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: theme.textMuted, textAlign: 'center', marginTop: 40, opacity: 0.6 },
});
