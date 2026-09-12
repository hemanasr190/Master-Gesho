import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  ActivityIndicator, RefreshControl, Modal, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth, useAlert } from '@/template';
import {
  fetchMediaFiles, uploadMediaFile, deleteMediaFile, formatFileSize,
  getFileIcon, getFileColor, MediaFile, MediaType,
} from '../services/mediaService';

const TYPE_FILTERS: { id: MediaType; label: string; icon: string }[] = [
  { id: 'all', label: 'الكل', icon: 'apps' },
  { id: 'image', label: 'صور', icon: 'image' },
  { id: 'video', label: 'فيديو', icon: 'video-library' },
  { id: 'document', label: 'مستندات', icon: 'description' },
  { id: 'other', label: 'أخرى', icon: 'more-horiz' },
];

function FileCard({ file, theme, onDelete, onPreview }: {
  file: MediaFile; theme: any; onDelete: () => void; onPreview: () => void;
}) {
  const color = getFileColor(file.type);
  const icon = getFileIcon(file.type);
  const date = new Date(file.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });

  return (
    <Pressable onPress={onPreview} style={[fc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {file.type === 'image' ? (
        <Image source={{ uri: file.url }} style={fc.thumbnail} contentFit="cover" />
      ) : (
        <View style={[fc.iconBox, { backgroundColor: color + '15' }]}>
          <MaterialIcons name={icon as any} size={32} color={color} />
        </View>
      )}
      <View style={fc.info}>
        <Text style={[fc.name, { color: theme.textPrimary }]} numberOfLines={1}>{file.name}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[fc.meta, { color: theme.textMuted }]}>{formatFileSize(file.size)}</Text>
          <Text style={[fc.meta, { color: theme.textMuted }]}>{date}</Text>
        </View>
        <View style={[fc.typeBadge, { backgroundColor: color + '15' }]}>
          <Text style={[fc.typeText, { color }]}>{file.type === 'image' ? 'صورة' : file.type === 'video' ? 'فيديو' : file.type === 'document' ? 'مستند' : 'ملف'}</Text>
        </View>
      </View>
      <Pressable onPress={onDelete} style={fc.deleteBtn} hitSlop={8}>
        <MaterialIcons name="delete-outline" size={18} color={theme.error} />
      </Pressable>
    </Pressable>
  );
}

const fc = StyleSheet.create({
  card: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, marginBottom: 12 },
  thumbnail: { width: '100%', height: 160 },
  iconBox: { height: 120, alignItems: 'center', justifyContent: 'center' },
  info: { padding: 12, gap: 5 },
  name: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  meta: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, alignSelf: 'flex-start' },
  typeText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  deleteBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});

export default function MediaCenterScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeType, setActiveType] = useState<MediaType>('all');
  const [search, setSearch] = useState('');
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  const loadFiles = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchMediaFiles(user.id, activeType, 'root', search);
    setFiles(data);
  }, [user?.id, activeType, search]);

  useEffect(() => {
    loadFiles().finally(() => setLoading(false));
  }, [loadFiles]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  }, [loadFiles]);

  const handleUpload = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('مطلوب إذن', 'نحتاج إذن للوصول لمكتبة الصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64 || !user?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploading(true);

    const binaryStr = atob(asset.base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const fileName = asset.fileName || `image_${Date.now()}.jpg`;
    const mimeType = asset.mimeType || 'image/jpeg';
    const size = asset.fileSize || bytes.length;

    const file = await uploadMediaFile(user.id, fileName, bytes, mimeType, size);
    setUploading(false);

    if (file) {
      setFiles(prev => [file, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('تم الرفع', 'الصورة محفوظة في مركز الوسائط');
    } else {
      showAlert('خطأ', 'فشل في رفع الملف');
    }
  }, [user?.id, showAlert]);

  const handleDelete = useCallback((file: MediaFile) => {
    showAlert('حذف الملف', `هل تريد حذف "${file.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const ok = await deleteMediaFile(file);
        if (ok) setFiles(prev => prev.filter(f => f.id !== file.id));
        else showAlert('خطأ', 'فشل في حذف الملف');
      }},
    ]);
  }, [showAlert]);

  const totalSize = useMemo(() => files.reduce((acc, f) => acc + f.size, 0), [files]);
  const s = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Image Preview Modal */}
      {previewFile && previewFile.type === 'image' && (
        <Modal transparent animationType="fade" statusBarTranslucent>
          <Pressable style={s.previewOverlay} onPress={() => setPreviewFile(null)}>
            <Image source={{ uri: previewFile.url }} style={s.previewImage} contentFit="contain" />
            <View style={s.previewInfo}>
              <Text style={s.previewName}>{previewFile.name}</Text>
              <Text style={s.previewMeta}>{formatFileSize(previewFile.size)}</Text>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
        </Pressable>
        <View>
          <Text style={s.title}>مركز الوسائط</Text>
          <Text style={s.sub}>{files.length} ملف · {formatFileSize(totalSize)}</Text>
        </View>
        <Pressable onPress={handleUpload} disabled={uploading}
          style={[s.uploadBtn, { backgroundColor: theme.primary }]}>
          {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialIcons name="upload" size={18} color="#FFF" />}
        </Pressable>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={[s.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialIcons name="search" size={18} color={theme.textMuted} />
          <TextInput style={[s.searchInput, { color: theme.textPrimary }]}
            value={search} onChangeText={setSearch}
            placeholder="ابحث في الملفات..."
            placeholderTextColor={theme.textMuted}
            textAlign="right" />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <MaterialIcons name="close" size={16} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {TYPE_FILTERS.map(f => (
          <Pressable key={f.id} style={[s.filterChip, activeType === f.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => { setActiveType(f.id); Haptics.selectionAsync(); }}>
            <MaterialIcons name={f.icon as any} size={14} color={activeType === f.id ? '#FFF' : theme.textSecondary} />
            <Text style={[s.filterText, activeType === f.id && { color: '#FFF' }]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : files.length === 0 ? (
        <View style={s.emptyBox}>
          <MaterialIcons name="perm-media" size={64} color={theme.textMuted} />
          <Text style={s.emptyTitle}>{search ? 'لا توجد نتائج' : 'مركز الوسائط فارغ'}</Text>
          <Text style={s.emptySub}>{search ? 'جرب كلمات بحث مختلفة' : 'ارفع صورك وملفاتك هنا'}</Text>
          {!search && (
            <Pressable onPress={handleUpload} style={[s.emptyBtn, { backgroundColor: theme.primary }]}>
              <MaterialIcons name="upload" size={16} color="#FFF" />
              <Text style={s.emptyBtnText}>رفع ملف</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
        >
          {/* Stats */}
          <Animated.View entering={FadeInDown.duration(300)} style={[s.statsBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {[
              { label: 'صور', count: files.filter(f => f.type === 'image').length, color: '#3B82F6', icon: 'image' },
              { label: 'فيديو', count: files.filter(f => f.type === 'video').length, color: '#8B5CF6', icon: 'video-library' },
              { label: 'مستندات', count: files.filter(f => f.type === 'document').length, color: '#F59E0B', icon: 'description' },
            ].map((stat, i) => (
              <View key={i} style={[s.statItem, i > 0 && { borderRightWidth: 1, borderRightColor: theme.border }]}>
                <MaterialIcons name={stat.icon as any} size={18} color={stat.color} />
                <Text style={[s.statValue, { color: stat.color }]}>{stat.count}</Text>
                <Text style={[s.statLabel, { color: theme.textMuted }]}>{stat.label}</Text>
              </View>
            ))}
          </Animated.View>

          {files.map((file, i) => (
            <Animated.View key={file.id} entering={FadeInDown.duration(260).delay(i * 40)}>
              <FileCard file={file} theme={theme}
                onDelete={() => handleDelete(file)}
                onPreview={() => setPreviewFile(file)} />
            </Animated.View>
          ))}
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
  uploadBtn: { marginLeft: 'auto', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { padding: 16, paddingBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', height: 22, writingDirection: 'rtl' },
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
  filterText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: t.textSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Cairo_600SemiBold', color: t.textPrimary },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: t.textMuted, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: '#FFF' },
  statsBar: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14 },
  statValue: { fontSize: 20, fontFamily: 'Cairo_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Cairo_500Medium' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  previewImage: { width: '100%', height: '80%' },
  previewInfo: { paddingTop: 16, alignItems: 'center', gap: 4 },
  previewName: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#FFF' },
  previewMeta: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.7)' },
});
