import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

type Photo = { id: string; caption: string; image_base64: string; day: number; created_at: string };

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [day, setDay] = useState(1);
  const [pending, setPending] = useState<string | null>(null);

  const load = async () => {
    try { setPhotos(await api.listPhotos()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
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
    } finally { setUploading(false); }
  };

  const remove = async (id: string) => {
    await api.deletePhoto(id);
    load();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Galeria" subtitle="Guarda as melhores memórias da viagem" testID="gallery-header" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Upload */}
          <View style={styles.upload} testID="gallery-upload">
            {pending ? (
              <>
                <Image source={{ uri: pending }} style={styles.preview} />
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
                    {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar foto</Text>}
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable onPress={pickImage} style={styles.pickBtn} testID="gallery-pick">
                <Ionicons name="camera" size={28} color={colors.brandDark} />
                <Text style={styles.pickTitle}>Adicionar foto</Text>
                <Text style={styles.pickSub}>Escolhe uma foto da galeria</Text>
              </Pressable>
            )}
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.brand} />
          ) : photos.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={40} color={colors.onSurfaceMuted} />
              <Text style={styles.emptyText}>Ainda sem fotos. As primeiras memórias vão aparecer aqui.</Text>
            </View>
          ) : (
            photos.map((p) => (
              <View key={p.id} style={styles.photoCard} testID={`photo-${p.id}`}>
                <Image source={{ uri: p.image_base64 }} style={styles.photoImg} />
                <View style={styles.photoInfo}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayLabel}>DIA {p.day}</Text>
                    <Text style={styles.photoCaption}>{p.caption}</Text>
                  </View>
                  <Pressable onPress={() => remove(p.id)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  upload: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadows.soft, gap: spacing.md },
  pickBtn: { alignItems: "center", padding: spacing.xl, gap: spacing.sm, borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.md },
  pickTitle: { ...typography.h3, color: colors.onSurface },
  pickSub: { fontSize: 12, color: colors.onSurfaceMuted },
  preview: { width: "100%", height: 200, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
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
  photoInfo: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  dayLabel: { fontSize: 10, letterSpacing: 1.2, fontWeight: "800", color: colors.brandSecondary },
  photoCaption: { fontSize: 14, color: colors.onSurface, marginTop: 2, fontWeight: "600" },
});
