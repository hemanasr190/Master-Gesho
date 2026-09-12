/**
 * pushNotificationService.ts
 * Manages expo-notifications: permissions, token registration,
 * and scheduling local notifications for messages, suggestions, and daily challenges.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/template';

// ── Default handler ────────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Channel setup (Android) ───────────────────────────────────────────────────
export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'الرسائل',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('suggestions', {
      name: 'الاقتراحات',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('challenges', {
      name: 'التحديات اليومية',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('general', {
      name: 'عام',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
}

// ── Permission & token registration ──────────────────────────────────────────
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    await setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    if (userId && token) {
      const supabase = getSupabaseClient();
      await supabase
        .from('user_profiles')
        .update({ push_token: token })
        .eq('id', userId);
    }

    return token;
  } catch (err) {
    console.error('Error registering for push notifications:', err);
    return null;
  }
}

// ── Schedule daily challenge reminder ─────────────────────────────────────────
export async function scheduleDailyChallengeReminder(hour = 9, minute = 0) {
  try {
    // Cancel existing challenge reminders
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const challengeNotifs = scheduled.filter(n => n.identifier?.startsWith('daily-challenge'));
    for (const n of challengeNotifs) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }

    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-challenge-reminder',
      content: {
        title: '🎯 تحديات اليوم تنتظرك!',
        body: 'اكسب نقاطاً يومية — صوّت على أدوات، احفظ مفضلاتك، وجرب استوديو AI',
        sound: 'default',
        data: { type: 'challenge', route: '/(tabs)' },
      },
      trigger: {
        hour,
        minute,
        repeats: true,
        channelId: 'challenges',
      } as any,
    });

    console.log(`Daily challenge reminder scheduled at ${hour}:${String(minute).padStart(2, '0')}`);
  } catch (err) {
    console.error('Error scheduling daily challenge reminder:', err);
  }
}

// ── Cancel daily challenge reminder ──────────────────────────────────────────
export async function cancelDailyChallengeReminder() {
  try {
    await Notifications.cancelScheduledNotificationAsync('daily-challenge-reminder');
  } catch (err) {
    console.error('Error canceling challenge reminder:', err);
  }
}

// ── Send local notification for new messages ──────────────────────────────────
export async function sendNewMessageNotification(senderName: string, preview: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💬 رسالة جديدة من ${senderName}`,
        body: preview.length > 80 ? preview.substring(0, 80) + '...' : preview,
        sound: 'default',
        data: { type: 'message', route: '/messages' },
      },
      trigger: null, // immediate
    });
  } catch (err) {
    console.error('Error sending message notification:', err);
  }
}

// ── Send notification for suggestion vote milestone ───────────────────────────
export async function sendSuggestionVoteNotification(suggestionTitle: string, voteCount: number) {
  try {
    const milestone = [5, 10, 25, 50, 100].find(m => m === voteCount);
    if (!milestone) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🗳️ اقتراحك يحصد ${voteCount} صوت!`,
        body: `"${suggestionTitle}" وصل لـ ${voteCount} تصويت — تابع نمو اقتراحك`,
        sound: 'default',
        data: { type: 'suggestion', route: '/suggestions' },
      },
      trigger: null,
    });
  } catch (err) {
    console.error('Error sending suggestion vote notification:', err);
  }
}

// ── Dismiss all notifications ─────────────────────────────────────────────────
export async function dismissAllNotifications() {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch (err) {
    console.error('Error dismissing notifications:', err);
  }
}

// ── Get notification preferences from DB ─────────────────────────────────────
export async function getNotificationPrefs(userId: string): Promise<{
  messages: boolean;
  suggestions: boolean;
  challenges: boolean;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('notification_prefs')
      .eq('id', userId)
      .single();

    return data?.notification_prefs || { messages: true, suggestions: true, challenges: true };
  } catch {
    return { messages: true, suggestions: true, challenges: true };
  }
}

// ── Save notification preferences to DB ──────────────────────────────────────
export async function saveNotificationPrefs(
  userId: string,
  prefs: { messages: boolean; suggestions: boolean; challenges: boolean },
) {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('user_profiles')
      .update({ notification_prefs: prefs })
      .eq('id', userId);

    // Schedule or cancel challenge reminder based on prefs
    if (prefs.challenges) {
      await scheduleDailyChallengeReminder(9, 0);
    } else {
      await cancelDailyChallengeReminder();
    }
  } catch (err) {
    console.error('Error saving notification prefs:', err);
  }
}
