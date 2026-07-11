import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

type Entry = { id: string; title: string; content: string; day: number; mood: string; created_at: string };

const MOODS = [
  { key: "happy", label: "Feliz", icon: "happy" as const },
  { key: "beach", label: "Praia", icon: "sunny" as const },
  { key: "food", label: "Comida", icon: "restaurant" as const },
  { key: "wow", label: "Uau!", icon: "sparkles" as const },
  { key: "tired", label: "Cansado", icon: "moon" as const },
];

export default function Diary() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [day, setDay] = useState(1);
  const [mood, setMood] = useState("happy");

  const load = async () => {
    try { setEntries(await api.listDiary()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await api.addDiary({ title: title.trim(), content: content.trim(), day, mood });
      setTitle(""); setContent(""); setDay(1); setMood("happy");
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    await api.deleteDiary(id);
    load();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Diário" subtitle="Escreve as memórias que quiseres guardar" testID="diary-header" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form} testID="diary-form">
            <Text style={styles.sectionTitle}>Nova entrada</Text>
            <TextInput
              value={title} onChangeText={setTitle}
              placeholder="Título (ex: Dia mágico em Benagil)"
              placeholderTextColor={colors.onSurfaceMuted}
              style={styles.input} testID="diary-title"
            />
            <TextInput
              value={content} onChangeText={setContent}
              placeholder="Escreve como foi o dia…"
              placeholderTextColor={colors.onSurfaceMuted}
              multiline style={[styles.input, styles.textarea]} testID="diary-content"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {[1, 2, 3, 4].map((d) => (
                <Pressable key={d} onPress={() => setDay(d)} style={[styles.chip, day === d && styles.chipActive]} testID={`diary-day-${d}`}>
                  <Text style={[styles.chipText, day === d && styles.chipTextActive]}>Dia {d}</Text>
                </Pressable>
              ))}
              {MOODS.map((m) => (
                <Pressable key={m.key} onPress={() => setMood(m.key)} style={[styles.chip, mood === m.key && styles.chipMoodActive]} testID={`diary-mood-${m.key}`}>
                  <Ionicons name={m.icon} size={12} color={mood === m.key ? "#fff" : colors.brandDark} />
                  <Text style={[styles.chipText, mood === m.key && styles.chipTextActive]}>{m.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={save} disabled={saving || !title.trim() || !content.trim()} style={[styles.saveBtn, (saving || !title.trim() || !content.trim()) && { opacity: 0.5 }]} testID="diary-save">
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="save" size={16} color="#fff" />
                  <Text style={styles.saveText}>Guardar memória</Text>
                </>
              )}
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.brand} />
          ) : entries.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={40} color={colors.onSurfaceMuted} />
              <Text style={styles.emptyText}>O diário está vazio. Escreve a primeira memória acima.</Text>
            </View>
          ) : (
            entries.map((e) => {
              const m = MOODS.find((x) => x.key === e.mood);
              return (
                <View key={e.id} style={styles.entry} testID={`entry-${e.id}`}>
                  <View style={styles.entryTop}>
                    <View style={styles.dayBadge}><Text style={styles.dayBadgeText}>DIA {e.day}</Text></View>
                    {m && (
                      <View style={styles.moodBadge}>
                        <Ionicons name={m.icon} size={12} color={colors.brandDark} />
                        <Text style={styles.moodText}>{m.label}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }} />
                    <Pressable onPress={() => remove(e.id)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </Pressable>
                  </View>
                  <Text style={styles.entryTitle}>{e.title}</Text>
                  <Text style={styles.entryBody}>{e.content}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  form: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadows.soft },
  sectionTitle: { ...typography.h3, color: colors.onSurface },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 14, color: colors.onSurface,
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  chipRow: { gap: spacing.sm, paddingVertical: 4 },
  chip: {
    height: 34, paddingHorizontal: spacing.md, borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 4, flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipMoodActive: { backgroundColor: colors.brandSecondary },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.brandDark },
  chipTextActive: { color: "#fff" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.brandSecondary, borderRadius: radius.md, paddingVertical: 14 },
  saveText: { color: "#fff", fontWeight: "700" },
  empty: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  emptyText: { fontSize: 13, color: colors.onSurfaceMuted, textAlign: "center" },
  entry: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadows.soft },
  entryTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  dayBadge: { backgroundColor: colors.brandDark, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  dayBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  moodBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  moodText: { color: colors.brandDark, fontSize: 10, fontWeight: "700" },
  entryTitle: { ...typography.h3, color: colors.onSurface },
  entryBody: { fontSize: 14, color: colors.onSurfaceTertiary, lineHeight: 20, marginTop: 6 },
});
