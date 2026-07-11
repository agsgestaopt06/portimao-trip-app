import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, SlideInDown } from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";

import { api } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

type Media = {
  id: string;
  caption: string;
  image_base64: string;
  day: number;
  created_at: string;
};

function isVideo(uri: string): boolean {
  return uri.startsWith("data:video") || /\.(mp4|mov|webm|m4v)$/i.test(uri);
}

export default function Gallery() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [day, setDay] = useState(1);
  const [pending, setPending] = useState<string | null>(null);
  const [previewer, setPreviewer] = useState<Media | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    try { setItems(await api.listPhotos()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const pickMedia = async (mode: "photo" | "video") => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return showToast("Permissão negada");
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        mode === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
      videoMaxDuration: 20,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    if (mode === "video") {
      // Videos: use URI directly to avoid huge base64; on web fetch as base64
      if (Platform.OS === "web" && a.uri.startsWith("blob:")) {
        try {
          const r = await fetch(a.uri);
          const b = await r.blob();
          const reader = new FileReader();
          reader.onload = () => setPending(reader.result as string);
          reader.readAsDataURL(b);
        } catch {
          setPending(a.uri);
        }
      } else if (a.base64) {
        setPending(`data:video/mp4;base64,${a.base64}`);
      } else {
        setPending(a.uri);
      }
    } else if (a.base64) {
      setPending(`data:image/jpeg;base64,${a.base64}`);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return showToast("Permissão de câmara negada");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
    if (!res.canceled && res.assets[0]?.base64) {
      setPending(`data:image/jpeg;base64,${res.assets[0].base64}`);
    }
  };

  const save = async () => {
    if (!pending || !caption.trim()) return;
    setUploading(true);
    try {
      await api.addPhoto({ caption: caption.trim(), image_base64: pending, day });
      setPending(null); setCaption(""); setDay(1);
      await load();
      showToast("✓ Guardado no álbum");
    } finally { setUploading(false); }
  };

  const remove = async (id: string) => {
    await api.deletePhoto(id);
    setPreviewer(null);
    load();
  };

  const saveToDevice = async (m: Media) => {
    try {
      if (Platform.OS === "web") {
        // Web: trigger download
        const a = document.createElement("a");
        a.href = m.image_base64;
        a.download = `${m.caption.replace(/[^\w]+/g, "_")}.${isVideo(m.image_base64) ? "mp4" : "jpg"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast("✓ Download iniciado");
        return;
      }
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) return showToast("Permissão negada");
      // Write base64 to file then save
      const ext = isVideo(m.image_base64) ? "mp4" : "jpg";
      const filename = `${FileSystem.cacheDirectory}portimao_${m.id}.${ext}`;
      const b64 = m.image_base64.split(",")[1] || m.image_base64;
      await FileSystem.writeAsStringAsync(filename, b64, { encoding: FileSystem.EncodingType.Base64 });
      const asset = await MediaLibrary.createAssetAsync(filename);
      try {
        await MediaLibrary.createAlbumAsync("Portimão '26", asset, false);
      } catch { /* album may exist */ }
      showToast("✓ Guardado na galeria");
    } catch {
      showToast("Erro ao guardar");
    }
  };

  const share = async (m: Media) => {
    try {
      if (Platform.OS === "web") {
        // Web: try navigator.share
        try {
          if ((navigator as any).share) {
            const blob = await (await fetch(m.image_base64)).blob();
            const file = new File([blob], `portimao_${m.id}.jpg`, { type: blob.type });
            await (navigator as any).share({
              title: m.caption,
              text: `${m.caption} — Portimão '26`,
              files: [file],
            });
            return;
          }
        } catch { /* fallback below */ }
        const a = document.createElement("a");
        a.href = m.image_base64;
        a.download = `${m.caption}.jpg`;
        a.click();
        showToast("✓ Descarregada para partilhar");
        return;
      }
      const ext = isVideo(m.image_base64) ? "mp4" : "jpg";
      const filename = `${FileSystem.cacheDirectory}portimao_${m.id}.${ext}`;
      const b64 = m.image_base64.split(",")[1] || m.image_base64;
      await FileSystem.writeAsStringAsync(filename, b64, { encoding: FileSystem.EncodingType.Base64 });
      const ok = await Sharing.isAvailableAsync();
      if (!ok) return showToast("Partilha indisponível");
      await Sharing.shareAsync(filename, {
        dialogTitle: `Partilhar: ${m.caption}`,
        mimeType: isVideo(m.image_base64) ? "video/mp4" : "image/jpeg",
      });
    } catch {
      showToast("Erro ao partilhar");
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Galeria" subtitle="Fotos & vídeos — abrir, guardar, partilhar" testID="gallery-header" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Upload */}
          <View style={styles.upload} testID="gallery-upload">
            {pending ? (
              <>
                {isVideo(pending) ? (
                  <View style={[styles.preview, styles.videoIndicator]}>
                    <Ionicons name="videocam" size={40} color={colors.brandDark} />
                    <Text style={styles.previewVideoLabel}>Vídeo pronto para guardar</Text>
                  </View>
                ) : (
                  <Image source={{ uri: pending }} style={styles.preview} />
                )}
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Legenda (ex: Arthur nas Grutas)"
                  placeholderTextColor={colors.onSurfaceMuted}
                  style={styles.input}
                  testID="gallery-caption"
                />
                <View style={styles.dayRow}>
                  {[1, 2, 3, 4].map((d) => (
                    <Pressable key={d} onPress={() => setDay(d)} style={[styles.dayChip, day === d && styles.dayChipActive]} testID={`gallery-day-${d}`}>
                      <Text style={[styles.dayText, day === d && styles.dayTextActive]}>Dia {d}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Pressable onPress={() => { setPending(null); setCaption(""); }} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable onPress={save} disabled={uploading || !caption.trim()} style={[styles.saveBtn, (!caption.trim() || uploading) && { opacity: 0.5 }]} testID="gallery-save">
                    {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar</Text>}
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.pickRow}>
                <Pressable onPress={() => pickMedia("photo")} style={styles.pickBtn} testID="gallery-pick-photo">
                  <Ionicons name="images" size={26} color={colors.brandDark} />
                  <Text style={styles.pickTitle}>Foto</Text>
                  <Text style={styles.pickSub}>da galeria</Text>
                </Pressable>
                <Pressable onPress={() => pickMedia("video")} style={styles.pickBtn} testID="gallery-pick-video">
                  <Ionicons name="videocam" size={26} color={colors.brandDark} />
                  <Text style={styles.pickTitle}>Vídeo</Text>
                  <Text style={styles.pickSub}>até 20s</Text>
                </Pressable>
                <Pressable onPress={takePhoto} style={styles.pickBtn} testID="gallery-camera">
                  <Ionicons name="camera" size={26} color={colors.brandDark} />
                  <Text style={styles.pickTitle}>Câmara</Text>
                  <Text style={styles.pickSub}>tirar já</Text>
                </Pressable>
              </View>
            )}
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.brand} />
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={40} color={colors.onSurfaceMuted} />
              <Text style={styles.emptyText}>Ainda sem memórias. As primeiras vão aparecer aqui.</Text>
            </View>
          ) : (
            items.map((p, i) => {
              const video = isVideo(p.image_base64);
              return (
                <Animated.View key={p.id} entering={FadeInDown.delay(40 * i)}>
                  <Pressable style={styles.photoCard} onPress={() => setPreviewer(p)} testID={`photo-${p.id}`}>
                    {video ? (
                      <View style={[styles.photoImg, { backgroundColor: "#000", alignItems: "center", justifyContent: "center" }]}>
                        <Ionicons name="play-circle" size={54} color="rgba(255,255,255,0.9)" />
                        <View style={styles.videoBadge}>
                          <Ionicons name="videocam" size={11} color="#fff" />
                          <Text style={styles.videoBadgeText}>VÍDEO</Text>
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri: p.image_base64 }} style={styles.photoImg} />
                    )}
                    <View style={styles.photoInfo}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayLabel}>DIA {p.day}</Text>
                        <Text style={styles.photoCaption}>{p.caption}</Text>
                      </View>
                      <View style={styles.thumbActions}>
                        <Pressable onPress={() => saveToDevice(p)} hitSlop={8} style={styles.thumbBtn} testID={`photo-save-${p.id}`}>
                          <Ionicons name="download" size={16} color={colors.brandPrimary} />
                        </Pressable>
                        <Pressable onPress={() => share(p)} hitSlop={8} style={styles.thumbBtn} testID={`photo-share-${p.id}`}>
                          <Ionicons name="share-social" size={16} color={colors.brandPrimary} />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Full preview modal */}
      <Modal
        visible={!!previewer}
        transparent
        animationType={Platform.OS === "web" ? "fade" : "slide"}
        onRequestClose={() => setPreviewer(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPreviewer(null)}>
          <Animated.View entering={SlideInDown.duration(280)} style={styles.previewSheet}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              {previewer && <PreviewContent media={previewer} />}
              {previewer && (
                <View style={styles.previewActions}>
                  <Pressable style={styles.previewBtn} onPress={() => previewer && saveToDevice(previewer)}>
                    <Ionicons name="download" size={18} color="#fff" />
                    <Text style={styles.previewBtnText}>Guardar</Text>
                  </Pressable>
                  <Pressable style={styles.previewBtn} onPress={() => previewer && share(previewer)}>
                    <Ionicons name="share-social" size={18} color="#fff" />
                    <Text style={styles.previewBtnText}>Partilhar</Text>
                  </Pressable>
                  <Pressable style={[styles.previewBtn, { backgroundColor: colors.error }]} onPress={() => previewer && remove(previewer.id)}>
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.previewBtnText}>Apagar</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Toast */}
      {toast && (
        <Animated.View entering={FadeIn} style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function PreviewContent({ media }: { media: Media }) {
  const video = isVideo(media.image_base64);
  const player = useVideoPlayer(video ? media.image_base64 : "", (p) => {
    if (video) {
      p.loop = false;
      p.play();
    }
  });
  return (
    <>
      <View style={styles.previewHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.previewKicker}>DIA {media.day}</Text>
          <Text style={styles.previewTitle}>{media.caption}</Text>
        </View>
      </View>
      {video ? (
        <VideoView player={player} style={styles.previewImage} contentFit="contain" allowsFullscreen />
      ) : (
        <Image source={{ uri: media.image_base64 }} style={styles.previewImage} resizeMode="contain" />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  upload: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadows.soft, gap: spacing.md },
  pickRow: { flexDirection: "row", gap: spacing.sm },
  pickBtn: { flex: 1, alignItems: "center", padding: spacing.md, gap: 4, borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.md },
  pickTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface, marginTop: 4 },
  pickSub: { fontSize: 11, color: colors.onSurfaceMuted },
  preview: { width: "100%", height: 220, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  videoIndicator: { alignItems: "center", justifyContent: "center", gap: spacing.sm },
  previewVideoLabel: { fontSize: 12, color: colors.brandDark, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 14, color: colors.onSurface,
  },
  dayRow: { flexDirection: "row", gap: spacing.sm },
  dayChip: { flex: 1, height: 40, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  dayChipActive: { backgroundColor: colors.brandPrimary },
  dayText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  dayTextActive: { color: "#fff" },
  cancelBtn: { flex: 1, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  cancelText: { color: colors.onSurface, fontWeight: "600" },
  saveBtn: { flex: 2, height: 46, borderRadius: radius.md, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
  empty: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  emptyText: { fontSize: 13, color: colors.onSurfaceMuted, textAlign: "center" },
  photoCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, overflow: "hidden", ...shadows.soft },
  photoImg: { width: "100%", height: 220 },
  videoBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  videoBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  photoInfo: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  dayLabel: { fontSize: 10, letterSpacing: 1.2, fontWeight: "800", color: colors.brandSecondary },
  photoCaption: { fontSize: 14, color: colors.onSurface, marginTop: 2, fontWeight: "600" },
  thumbActions: { flexDirection: "row", gap: 6 },
  thumbBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  // Preview modal
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  previewSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing["2xl"],
    gap: spacing.md,
  },
  previewHeader: { flexDirection: "row", alignItems: "center" },
  previewKicker: { fontSize: 10, letterSpacing: 1.2, fontWeight: "800", color: colors.brandSecondary },
  previewTitle: { ...typography.h2, color: colors.onSurface, marginTop: 2 },
  previewImage: { width: "100%", height: 380, borderRadius: radius.lg, backgroundColor: "#000" },
  previewActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  previewBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12, borderRadius: radius.md,
  },
  previewBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  toast: {
    position: "absolute", left: 20, right: 20, bottom: 100,
    backgroundColor: colors.onSurface,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    ...shadows.medium,
  },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
