import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Type, X, ChevronLeft, Check, ImagePlus } from 'lucide-react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import ComposePostOptions, { type SelectedLocation } from '@/components/post/ComposePostOptions';
import type { UserSummary } from '@/types/user';
import { useAuthStore } from '@/stores/authStore';
import { createPost } from '@/services/posts.service';
import { uploadFile, type UploadFileType } from '@/services/upload.service';
import { colors, fonts, radius, shadows } from '@/constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 16;
const GRID_GAP = 3;
const GRID_COLS = 3;
const CELL = Math.floor((SCREEN_W - H_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
/** Same max aspect as feed PostCard (width × 0.88 height) */
const PREVIEW_W = SCREEN_W - H_PAD * 2;
const PREVIEW_H = Math.round(PREVIEW_W * 0.88);
const MAX_PHOTOS = 10;

type Mode = 'photo' | 'text';
type PhotoStep = 'gallery' | 'compose';
type GalleryPermission = 'checking' | 'undetermined' | 'granted' | 'denied';

function hasGalleryAccess(
  status: MediaLibrary.PermissionStatus,
  accessPrivileges?: MediaLibrary.PermissionResponse['accessPrivileges'],
) {
  return (
    status === MediaLibrary.PermissionStatus.GRANTED ||
    accessPrivileges === 'all' ||
    accessPrivileges === 'limited'
  );
}

function ModalSheet({ children }: { children: ReactNode }) {
  return (
    <View style={s.modalSheet}>
      <View style={s.modalHandle} />
      {children}
    </View>
  );
}

function HeaderBar({ left, title, right }: { left: ReactNode; title: string; right: ReactNode }) {
  return (
    <View style={s.headerBar}>
      <View style={s.headerSlot}>{left}</View>
      <Text style={s.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[s.headerSlot, s.headerSlotRight]}>{right}</View>
    </View>
  );
}

function TopChrome({
  header,
  showModeToggle = true,
  toggle,
}: {
  header: ReactNode;
  showModeToggle?: boolean;
  toggle: ReactNode;
}) {
  return (
    <View style={s.chromeBlock}>
      {header}
      {showModeToggle ? <View style={s.chromeToggleWrap}>{toggle}</View> : null}
    </View>
  );
}

export default function CreatePostScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('photo');
  const [photoStep, setPhotoStep] = useState<PhotoStep>('gallery');

  const [galleryAssets, setGalleryAssets] = useState<MediaLibrary.Asset[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryPermission, setGalleryPermission] = useState<GalleryPermission>('checking');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [caption, setCaption] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<UserSummary[]>([]);

  const selectedPhotos = useMemo(() => {
    const map = new Map(galleryAssets.map((a) => [a.id, a]));
    return selectedIds.map((id) => map.get(id)).filter((a): a is MediaLibrary.Asset => !!a);
  }, [galleryAssets, selectedIds]);

  const previewUri = selectedPhotos[0]?.uri ?? null;

  const loadGalleryAssets = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: 120,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      setGalleryAssets(page.assets);
    } catch {
      setGalleryPermission('denied');
      setGalleryAssets([]);
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  const refreshGalleryPermission = useCallback(async () => {
    const { status, accessPrivileges } = await MediaLibrary.getPermissionsAsync();
    if (hasGalleryAccess(status, accessPrivileges)) {
      setGalleryPermission('granted');
      return true;
    }
    if (status === MediaLibrary.PermissionStatus.DENIED) {
      setGalleryPermission('denied');
      return false;
    }
    setGalleryPermission('undetermined');
    return false;
  }, []);

  const requestGalleryAccess = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const { status, accessPrivileges } = await MediaLibrary.requestPermissionsAsync();
      if (hasGalleryAccess(status, accessPrivileges)) {
        setGalleryPermission('granted');
        await loadGalleryAssets();
        return;
      }
      setGalleryPermission('denied');
      setGalleryAssets([]);
    } catch {
      setGalleryPermission('denied');
      setGalleryAssets([]);
    } finally {
      setGalleryLoading(false);
    }
  }, [loadGalleryAssets]);

  useEffect(() => {
    if (mode !== 'photo' || photoStep !== 'gallery') return;

    void (async () => {
      setGalleryPermission('checking');
      const granted = await refreshGalleryPermission();
      if (granted) {
        await loadGalleryAssets();
      } else {
        setGalleryLoading(false);
      }
    })();
  }, [mode, photoStep, refreshGalleryPermission, loadGalleryAssets]);

  const { mutateAsync: submitPost, isPending } = useMutation({
    mutationFn: async () => {
      if (mode === 'text') {
        return createPost({
          postType: 'text',
          caption: caption.trim(),
          locationName: selectedLocation?.label,
          latitude: selectedLocation?.latitude,
          longitude: selectedLocation?.longitude,
          taggedUsernames: taggedUsers.length > 0 ? taggedUsers.map((u) => u.username) : undefined,
        });
      }

      const mediaUrls: Array<{
        url: string;
        mediaType: 'image';
        width?: number;
        height?: number;
      }> = [];

      for (const asset of selectedPhotos) {
        let uri = asset.uri;
        if (!asset.id.startsWith('picker-')) {
          const info = await MediaLibrary.getAssetInfoAsync(asset.id);
          uri = info.localUri ?? asset.uri;
        }
        const fileName = asset.filename ?? `photo_${asset.id}.jpg`;
        const lower = fileName.toLowerCase();
        const mimeType: UploadFileType = lower.endsWith('.png')
          ? 'image/png'
          : lower.endsWith('.webp')
            ? 'image/webp'
            : lower.endsWith('.heic')
              ? 'image/heic'
              : 'image/jpeg';

        const publicUrl = await uploadFile(uri, fileName, mimeType);
        mediaUrls.push({
          url: publicUrl,
          mediaType: 'image',
          width: asset.width,
          height: asset.height,
        });
      }

      return createPost({
        postType: 'photo',
        caption: caption.trim() || undefined,
        mediaUrls,
        locationName: selectedLocation?.label,
        latitude: selectedLocation?.latitude,
        longitude: selectedLocation?.longitude,
        taggedUsernames: taggedUsers.length > 0 ? taggedUsers.map((u) => u.username) : undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      router.back();
    },
    onError: (err) => {
      Alert.alert(
        'Could not post',
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      );
    },
  });

  const toggleSelect = (asset: MediaLibrary.Asset) => {
    setSelectedIds((prev) => {
      if (prev.includes(asset.id)) return prev.filter((id) => id !== asset.id);
      if (prev.length >= MAX_PHOTOS) {
        Alert.alert('Limit reached', `You can select up to ${MAX_PHOTOS} photos.`);
        return prev;
      }
      return [...prev, asset.id];
    });
  };

  const pickFromLibrary = async () => {
    // iOS 14+ system picker does not need full library permission (avoids duplicate Expo Go prompts).
    if (Platform.OS === 'android') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photos access', 'Allow photo library access to add images.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
      quality: 0.88,
    });
    if (result.canceled || !result.assets.length) return;

    const ids: string[] = [];
    const extras: MediaLibrary.Asset[] = [];
    for (const a of result.assets.slice(0, MAX_PHOTOS)) {
      const id = `picker-${a.assetId ?? a.uri}`;
      ids.push(id);
      extras.push({
        id,
        uri: a.uri,
        width: a.width,
        height: a.height,
        filename: a.fileName ?? `photo_${Date.now()}.jpg`,
        mediaType: 'photo',
        duration: 0,
        creationTime: Date.now(),
        modificationTime: Date.now(),
      } as MediaLibrary.Asset);
    }
    setGalleryAssets((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      const merged = [...prev];
      for (const e of extras) {
        if (!existing.has(e.id)) merged.unshift(e);
      }
      return merged;
    });
    setSelectedIds(ids.slice(0, MAX_PHOTOS));
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    if (next === 'photo') {
      setPhotoStep('gallery');
    } else {
      setPhotoStep('gallery');
      setSelectedIds([]);
    }
  };

  const canShareText = caption.trim().length > 0;
  const canProceedPhoto = selectedIds.length > 0;
  const canSharePhoto = selectedIds.length > 0;

  const closeScreen = () => router.back();

  const renderModeToggle = () => (
    <View style={s.segmentTrack}>
      <Pressable
        style={[s.segment, mode === 'photo' && s.segmentActive]}
        onPress={() => switchMode('photo')}
      >
        <ImagePlus
          size={15}
          strokeWidth={2}
          color={mode === 'photo' ? colors.onTeal : colors.textMuted}
        />
        <Text style={[s.segmentText, mode === 'photo' && s.segmentTextActive]}>Photo</Text>
      </Pressable>
      <Pressable
        style={[s.segment, mode === 'text' && s.segmentActive]}
        onPress={() => switchMode('text')}
      >
        <Type
          size={15}
          strokeWidth={2}
          color={mode === 'text' ? colors.onTeal : colors.textMuted}
        />
        <Text style={[s.segmentText, mode === 'text' && s.segmentTextActive]}>Text</Text>
      </Pressable>
    </View>
  );

  const renderComposeFields = () => (
    <>
      {mode === 'photo' && selectedPhotos.length > 0 && (
        <View style={s.thumbStrip}>
          {selectedPhotos.map((asset, index) => (
            <View key={asset.id} style={s.thumbWrap}>
              <Image source={{ uri: asset.uri }} style={s.thumb} contentFit="cover" />
              {selectedPhotos.length > 1 && (
                <View style={s.thumbBadge}>
                  <Text style={s.thumbBadgeText}>{index + 1}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={s.captionCard}>
        <UserAvatar name={user?.displayName ?? 'You'} avatarUrl={user?.avatarUrl} size={38} ring />
        <View style={s.captionField}>
          <TextInput
            style={s.captionInput}
            placeholder={mode === 'photo' ? 'Write a caption...' : 'What do you want to share?'}
            placeholderTextColor={colors.textMuted}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            autoFocus={mode === 'text'}
          />
          <Text style={s.charCount}>{caption.length}/2000</Text>
        </View>
      </View>

      <ComposePostOptions
        location={selectedLocation}
        onLocationChange={setSelectedLocation}
        taggedUsers={taggedUsers}
        onTaggedUsersChange={setTaggedUsers}
        excludeUserId={user?.id}
      />
    </>
  );

  /* ── Text mode: single screen ── */
  if (mode === 'text') {
    return (
      <ModalSheet>
        <KeyboardAvoidingView
          style={s.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TopChrome
            toggle={renderModeToggle()}
            header={
              <HeaderBar
                title="New post"
                left={
                  <Pressable onPress={closeScreen} hitSlop={10} style={s.headerIconBtn}>
                    <X size={20} strokeWidth={2} color={colors.textSecondary} />
                  </Pressable>
                }
                right={
                  <Pressable
                    onPress={() => void submitPost()}
                    disabled={!canShareText || isPending}
                    hitSlop={8}
                    style={s.headerActionBtn}
                  >
                    {isPending ? (
                      <ActivityIndicator size="small" color={colors.tealPrimary} />
                    ) : (
                      <Text style={[s.shareLabel, !canShareText && s.shareLabelDisabled]}>
                        Share
                      </Text>
                    )}
                  </Pressable>
                }
              />
            }
          />

          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.scrollContent, s.scrollContentBelowChrome]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderComposeFields()}
          </ScrollView>
        </KeyboardAvoidingView>
      </ModalSheet>
    );
  }

  /* ── Photo: compose step ── */
  if (photoStep === 'compose') {
    return (
      <ModalSheet>
        <KeyboardAvoidingView
          style={s.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TopChrome
            showModeToggle={false}
            toggle={null}
            header={
              <HeaderBar
                title="Details"
                left={
                  <Pressable
                    onPress={() => setPhotoStep('gallery')}
                    hitSlop={10}
                    style={s.headerIconBtn}
                  >
                    <ChevronLeft size={22} strokeWidth={2} color={colors.textPrimary} />
                  </Pressable>
                }
                right={
                  <Pressable
                    onPress={() => void submitPost()}
                    disabled={!canSharePhoto || isPending}
                    hitSlop={8}
                    style={s.headerActionBtn}
                  >
                    {isPending ? (
                      <ActivityIndicator size="small" color={colors.tealPrimary} />
                    ) : (
                      <Text style={[s.shareLabel, !canSharePhoto && s.shareLabelDisabled]}>
                        Share
                      </Text>
                    )}
                  </Pressable>
                }
              />
            }
          />

          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.scrollContent, s.scrollContentBelowChrome]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderComposeFields()}
          </ScrollView>
        </KeyboardAvoidingView>
      </ModalSheet>
    );
  }

  const renderPreviewSlot = () => (
    <View style={s.previewBlock}>
      <View style={s.previewSlot}>
        {previewUri ? (
          <>
            <Image source={{ uri: previewUri }} style={s.previewImage} contentFit="cover" />
            {selectedIds.length > 1 && (
              <View style={s.previewCountPill}>
                <Text style={s.previewCountText}>{selectedIds.length} selected</Text>
              </View>
            )}
          </>
        ) : (
          <View style={s.previewPlaceholder}>
            <View style={s.previewEmptyIcon}>
              <ImagePlus size={32} strokeWidth={1.5} color={colors.tealPrimary} />
            </View>
            <Text style={s.previewEmptyTitle}>Select photos to post</Text>
            <Text style={s.previewEmptySub}>Choose from the grid below</Text>
          </View>
        )}
      </View>
    </View>
  );

  /* ── Photo: gallery step ── */
  return (
    <ModalSheet>
      <View style={s.root}>
        <TopChrome
          toggle={renderModeToggle()}
          header={
            <HeaderBar
              title="New post"
              left={
                <Pressable onPress={closeScreen} hitSlop={10} style={s.headerIconBtn}>
                  <X size={20} strokeWidth={2} color={colors.textSecondary} />
                </Pressable>
              }
              right={
                <View style={s.headerRightInner}>
                  {selectedIds.length > 0 ? (
                    <View style={s.countPill}>
                      <Text style={s.countPillText}>
                        {selectedIds.length}/{MAX_PHOTOS}
                      </Text>
                    </View>
                  ) : null}
                </View>
              }
            />
          }
        />

        {renderPreviewSlot()}

        {galleryPermission === 'undetermined' ? (
          <View style={s.deniedWrap}>
            <Text style={s.deniedTitle}>Allow photo access</Text>
            <Text style={s.deniedText}>
              To show your photo grid, allow access when prompted. In Expo Go, if you already
              allowed another test account, tap Allow for this session too.
            </Text>
            <TouchableOpacity
              onPress={() => void requestGalleryAccess()}
              style={s.deniedBtn}
              disabled={galleryLoading}
            >
              <Text style={s.deniedBtnText}>{galleryLoading ? 'Opening…' : 'Allow access'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void pickFromLibrary()} style={s.deniedLink}>
              <Text style={s.deniedLinkText}>Pick photos without full access</Text>
            </TouchableOpacity>
          </View>
        ) : galleryPermission === 'denied' ? (
          <View style={s.deniedWrap}>
            <Text style={s.deniedTitle}>Photos access off</Text>
            <Text style={s.deniedText}>
              Turn on photo library access in Settings, or pick images with the system picker.
            </Text>
            <TouchableOpacity onPress={() => void Linking.openSettings()} style={s.deniedBtn}>
              <Text style={s.deniedBtnText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void pickFromLibrary()} style={s.deniedLink}>
              <Text style={s.deniedLinkText}>Pick photos manually</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void requestGalleryAccess()} style={s.deniedLink}>
              <Text style={s.deniedLinkText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : galleryLoading || galleryPermission === 'checking' ? (
          <View style={s.gridLoader}>
            <ActivityIndicator color={colors.tealPrimary} />
          </View>
        ) : (
          <FlatList
            data={galleryAssets}
            keyExtractor={(item) => item.id}
            numColumns={GRID_COLS}
            style={s.gridList}
            contentContainerStyle={[s.gridContent, { paddingBottom: 12 }]}
            columnWrapperStyle={s.gridRow}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const order = selectedIds.indexOf(item.id);
              const selected = order >= 0;
              return (
                <Pressable
                  onPress={() => toggleSelect(item)}
                  style={[s.gridCell, selected && s.gridCellSelected]}
                >
                  <Image source={{ uri: item.uri }} style={s.gridImage} contentFit="cover" />
                  {selected && (
                    <>
                      <View style={s.gridCheck} />
                      {selectedIds.length > 1 && (
                        <View style={s.gridOrder}>
                          <Text style={s.gridOrderText}>{order + 1}</Text>
                        </View>
                      )}
                      {selectedIds.length === 1 && (
                        <View style={s.gridCheckIcon}>
                          <Check size={16} strokeWidth={3} color={colors.onTeal} />
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              );
            }}
          />
        )}

        <View style={[s.proceedSafe, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity
            onPress={() => setPhotoStep('compose')}
            disabled={!canProceedPhoto}
            style={[s.proceedBtn, !canProceedPhoto && s.proceedBtnDisabled]}
            activeOpacity={0.88}
          >
            <Text style={s.proceedBtnText}>
              Proceed{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalSheet>
  );
}

const s = StyleSheet.create({
  modalSheet: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  chromeBlock: {
    backgroundColor: colors.bgPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface3,
  },
  chromeToggleWrap: {
    paddingHorizontal: H_PAD,
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  headerSlot: {
    width: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSlotRight: { alignItems: 'flex-end' },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  headerActionBtn: {
    minWidth: 64,
    height: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
  headerRightInner: {
    minWidth: 64,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.h2,
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: 4,
  },
  shareLabel: {
    fontFamily: fonts.bodyStrong,
    fontSize: 16,
    color: colors.tealPrimary,
  },
  shareLabelDisabled: { color: colors.textDisabled },
  countPill: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surface3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  countPillText: {
    fontFamily: fonts.stat,
    fontSize: 13,
    color: colors.tealPrimary,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.surface3,
    ...shadows.sm,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.tealPrimary, ...shadows.teal },
  segmentText: { fontFamily: fonts.bodyStrong, fontSize: 14, color: colors.textMuted },
  segmentTextActive: { color: colors.onTeal },
  previewBlock: {
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 10,
    alignItems: 'center',
  },
  previewSlot: {
    width: PREVIEW_W,
    height: PREVIEW_H,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.surface3,
    position: 'relative',
    ...shadows.md,
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  previewPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    backgroundColor: colors.surface1,
  },
  previewCountPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  previewCountText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  previewEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  previewEmptyTitle: {
    fontFamily: fonts.bodyStrong,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  previewEmptySub: {
    fontFamily: fonts.caption,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  gridList: { flex: 1 },
  gridContent: { paddingHorizontal: H_PAD, paddingTop: 4 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCell: {
    width: CELL,
    height: CELL,
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  gridCellSelected: {
    borderWidth: 2,
    borderColor: colors.tealPrimary,
  },
  gridImage: { width: '100%', height: '100%' },
  gridCheck: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,229,195,0.28)',
  },
  gridCheckIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOrder: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  gridOrderText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.onTeal,
  },
  gridLoader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deniedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  deniedTitle: {
    fontFamily: fonts.h2,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  deniedText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  deniedBtn: {
    backgroundColor: colors.tealPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  deniedBtnText: { fontFamily: fonts.button, fontSize: 13, color: colors.onTeal },
  deniedLink: { padding: 8 },
  deniedLinkText: { fontFamily: fonts.bodyStrong, fontSize: 14, color: colors.purpleSoft },
  proceedSafe: {
    paddingHorizontal: H_PAD,
    paddingTop: 10,
    backgroundColor: colors.bgPrimary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface3,
  },
  proceedBtn: {
    backgroundColor: colors.tealPrimary,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadows.teal,
  },
  proceedBtnDisabled: { opacity: 0.38 },
  proceedBtnText: {
    fontFamily: fonts.button,
    fontSize: 15,
    color: colors.onTeal,
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: H_PAD, paddingBottom: 32, gap: 16 },
  scrollContentBelowChrome: { paddingTop: 16 },
  thumbStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surface3,
  },
  thumb: { width: '100%', height: '100%' },
  thumbBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.tealPrimary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.onTeal,
  },
  captionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  captionField: { flex: 1, minHeight: 88 },
  captionInput: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
    minHeight: 72,
    padding: 0,
  },
  charCount: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 6,
  },
});
