import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing } from "@/src/theme";

type Item = { id: string; label: string; category: string; checked: boolean };

export default function Checklist() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { api.checklist().then(setItems).catch(() => {}); }, []);

  const grouped = useMemo(() => {
    const g: Record<string, Item[]> = {};
    items.forEach((i) => { (g[i.category] = g[i.category] || []).push(i); });
    return g;
  }, [items]);

  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  const pct = total ? (done / total) * 100 : 0;

  const toggle = async (id: string, checked: boolean) => {
    setItems((it) => it.map((x) => (x.id === id ? { ...x, checked: !checked } : x)));
    try { await api.toggleCheck(id, !checked); } catch {}
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Checklist" subtitle="Nada esquecido para a viagem" testID="checklist-header" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progress} testID="check-progress">
          <View style={styles.progressTop}>
            <Text style={styles.progressTitle}>Progresso da mala</Text>
            <Text style={styles.progressCount}>{done}/{total}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {Object.keys(grouped).map((cat) => (
          <View key={cat} style={styles.group}>
            <Text style={styles.groupTitle}>{cat.toUpperCase()}</Text>
            {grouped[cat].map((i) => (
              <Pressable
                key={i.id}
                onPress={() => toggle(i.id, i.checked)}
                style={styles.item}
                testID={`check-${i.id}`}
              >
                <View style={[styles.box, i.checked && styles.boxChecked]}>
                  {i.checked && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={[styles.label, i.checked && styles.labelChecked]}>{i.label}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: 80 },
  progress: { backgroundColor: colors.brandDark, borderRadius: radius.lg, padding: spacing.lg, ...shadows.medium },
  progressTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  progressCount: { color: colors.brandTertiary, fontSize: 16, fontWeight: "800" },
  barTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: radius.pill, marginTop: spacing.md, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.brandSecondary, borderRadius: radius.pill },
  group: { marginTop: spacing.xl },
  groupTitle: { fontSize: 11, letterSpacing: 1.2, fontWeight: "800", color: colors.brandSecondary, marginBottom: spacing.sm },
  item: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, ...shadows.soft,
  },
  box: {
    width: 24, height: 24, borderRadius: 8,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  boxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  label: { flex: 1, fontSize: 14, color: colors.onSurface },
  labelChecked: { textDecorationLine: "line-through", color: colors.onSurfaceMuted },
});
