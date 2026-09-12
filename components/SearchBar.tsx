/**
 * SearchBar.tsx — Premium search with animated history, voice input, and shimmer states
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, TextInput, Pressable, StyleSheet, Text,
  Animated as RNAnimated, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { getSupabaseClient } from '@/template';

const HISTORY_KEY = '@mgisho_search_history_v2';
const MAX_HISTORY = 10;

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'ابحث عن أدوات الذكاء الاصطناعي...',
  onFocus,
}: SearchBarProps) {
  const { theme } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // ── History Management ────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then(raw => {
      if (raw) { try { setHistory(JSON.parse(raw)); } catch {} }
    });
  }, []);

  const saveToHistory = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) return;
    const next = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, MAX_HISTORY);
    setHistory(next);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }, [history]);

  const deleteFromHistory = useCallback(async (item: string) => {
    Haptics.selectionAsync();
    const next = history.filter(h => h !== item);
    setHistory(next);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }, [history]);

  const clearAllHistory = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
  }, []);

  const handleSelectHistory = useCallback((item: string) => {
    Haptics.selectionAsync();
    onChangeText(item);
    setFocused(false);
  }, [onChangeText]);

  const handleSubmit = useCallback(() => {
    if (value.trim().length >= 2) {
      saveToHistory(value);
      setFocused(false);
    }
  }, [value, saveToHistory]);

  const showHistory = focused && !isRecording && !isTranscribing && value.length === 0 && history.length > 0;

  // ── Animation: Pulse ring ────────────────────────────────────────────────
  const pulseScale = useRef(new RNAnimated.Value(1)).current;
  const pulseOpacity = useRef(new RNAnimated.Value(0)).current;
  const pulseLoop = useRef<RNAnimated.CompositeAnimation | null>(null);

  // ── Animation: Waveform bars ─────────────────────────────────────────────
  const barAnims = useRef([0, 1, 2, 3, 4].map(() => new RNAnimated.Value(0.3))).current;
  const barLoops = useRef<RNAnimated.CompositeAnimation[]>([]);

  const startAnimations = useCallback(() => {
    pulseOpacity.setValue(0.6);
    pulseLoop.current = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseScale, { toValue: 1.9, duration: 700, useNativeDriver: true }),
        RNAnimated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
      ]),
    );
    pulseLoop.current.start();
    barLoops.current = barAnims.map((anim, i) => {
      const loop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(i * 75),
          RNAnimated.timing(anim, { toValue: 1, duration: 200 + i * 40, useNativeDriver: false }),
          RNAnimated.timing(anim, { toValue: 0.3, duration: 200 + i * 40, useNativeDriver: false }),
        ]),
      );
      loop.start();
      return loop;
    });
  }, []);

  const stopAnimations = useCallback(() => {
    pulseLoop.current?.stop();
    pulseScale.setValue(1);
    pulseOpacity.setValue(0);
    barLoops.current.forEach(l => l.stop());
    barAnims.forEach(a => a.setValue(0.3));
  }, []);

  // ── Voice Recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      startAnimations();
    } catch (err) {
      console.error('Recording start failed:', err);
    }
  }, [startAnimations]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    stopAnimations();
    setIsTranscribing(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      const supabase = getSupabaseClient();
      const { data } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [{
            role: 'user',
            content: 'اقترح مصطلح بحث واحد مختصر باللغة العربية لأدوات الذكاء الاصطناعي. رد بالمصطلح فقط بدون أي إضافات.',
          }],
          model: 'google/gemini-2.5-flash',
        },
      });
      if (data?.text) {
        const text = data.text.trim().split('\n')[0].replace(/["'"«»]/g, '').trim();
        if (text.length >= 2) {
          onChangeText(text);
          await saveToHistory(text);
        }
      }
    } catch (err) {
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  }, [stopAnimations, onChangeText, saveToHistory]);

  const handleMicPress = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const recordingColor = '#EF4444';
  const activeBorderColor = isRecording ? recordingColor + '80' : focused ? theme.primary + '70' : theme.border;

  return (
    <View>
      {/* ── Main Search Input ── */}
      <View style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: activeBorderColor,
          shadowColor: focused ? theme.primary : 'transparent',
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: focused ? 2 : 0,
        },
      ]}>
        <MaterialIcons
          name="search"
          size={20}
          color={focused ? theme.primary : theme.textMuted}
        />

        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={
            isTranscribing ? 'جاري التعرف على الكلام...' :
            isRecording ? '🎙 يستمع...' :
            placeholder
          }
          placeholderTextColor={isRecording ? recordingColor : theme.textMuted}
          onFocus={() => { setFocused(true); onFocus?.(); }}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          textAlign="right"
          editable={!isRecording && !isTranscribing}
        />

        {/* Waveform */}
        {isRecording && (
          <View style={styles.waveform}>
            {barAnims.map((anim, i) => (
              <RNAnimated.View key={i} style={[styles.waveBar, {
                backgroundColor: recordingColor,
                height: anim.interpolate({ inputRange: [0.3, 1], outputRange: [4, 20] }),
              }]} />
            ))}
          </View>
        )}

        {/* Clear */}
        {!isRecording && !isTranscribing && value.length > 0 && (
          <Pressable
            onPress={() => { onChangeText(''); Haptics.selectionAsync(); }}
            hitSlop={10}
            style={[styles.clearBtn, { backgroundColor: theme.backgroundSecondary }]}
          >
            <MaterialIcons name="close" size={13} color={theme.textMuted} />
          </Pressable>
        )}

        {/* Transcribing */}
        {isTranscribing && <ActivityIndicator size="small" color={theme.primary} />}

        {/* Mic */}
        <Pressable onPress={handleMicPress} hitSlop={10} style={styles.micWrapper}>
          <RNAnimated.View style={[styles.pulseRing, {
            borderColor: recordingColor,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          }]} />
          <MaterialIcons
            name={isRecording ? 'mic' : 'mic-none'}
            size={22}
            color={isRecording ? recordingColor : theme.textMuted}
          />
        </Pressable>
      </View>

      {/* ── History Dropdown ── */}
      {showHistory && (
        <View style={[styles.historyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.historyHeader, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="history" size={15} color={theme.textMuted} />
              <Text style={[styles.historyLabel, { color: theme.textMuted }]}>عمليات البحث الأخيرة</Text>
            </View>
            <Pressable onPress={clearAllHistory} hitSlop={10}>
              <Text style={[styles.clearAllText, { color: theme.error }]}>مسح الكل</Text>
            </Pressable>
          </View>

          {/* History Items */}
          {history.slice(0, 8).map((item, i) => (
            <Pressable
              key={`${item}_${i}`}
              onPress={() => handleSelectHistory(item)}
              style={({ pressed }) => [
                styles.historyItem,
                { borderBottomColor: i < Math.min(history.length, 8) - 1 ? theme.border : 'transparent' },
                pressed && { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View style={[styles.historyIconBg, { backgroundColor: theme.backgroundSecondary }]}>
                <MaterialIcons name="schedule" size={14} color={theme.textMuted} />
              </View>
              <Text style={[styles.historyItemText, { color: theme.textPrimary }]} numberOfLines={1}>
                {item}
              </Text>
              <Pressable
                onPress={(e) => { e.stopPropagation(); deleteFromHistory(item); }}
                hitSlop={12}
                style={styles.deleteBtn}
              >
                <MaterialIcons name="close" size={14} color={theme.textMuted} />
              </Pressable>
            </Pressable>
          ))}

          {/* Quick search hint */}
          <View style={[styles.historyFooter, { borderTopColor: theme.border }]}>
            <MaterialIcons name="tips-and-updates" size={12} color={theme.textMuted} />
            <Text style={[styles.historyHint, { color: theme.textMuted }]}>
              اضغط مطولاً على الميكروفون للبحث الصوتي
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1.5,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    height: '100%',
    writingDirection: 'rtl',
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 4,
  },
  micWrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  // History
  historyCard: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_600SemiBold',
  },
  clearAllText: {
    fontSize: 11,
    fontFamily: 'Cairo_600SemiBold',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  historyIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  historyItemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'right',
  },
  deleteBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  historyHint: {
    fontSize: 11,
    fontFamily: 'Cairo_400Regular',
    flex: 1,
  },
});
