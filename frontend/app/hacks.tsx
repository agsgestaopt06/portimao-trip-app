import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

type H = { id: string; title: string; description: string; savings: string; icon: string; category: string };

export default function Hacks() {
  const [items, setItems] = useState<H[]>([]);
  useEffect(() => { api.hacks().then(setItems).catch(() => {}); }, []);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Hacks & Segredos" subtitle="Segredos de agência local do Algarve" testID="hacks-header" />
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {items.map((h, i) => (
          <View key={h.id} style={[styles.card, i === 0 && styles.first]} testID={`hack-${h.id}`}>
            <View style={styles.left}>
              <View style={[styles.icon, i === 0 && { backgroundColor: colors.brandSecondary }]}>
                <Ionicons name={h.icon as any} size={20} color={i === 0 ? "#fff" : colors.brandDark} />
              </View>
              <View style={styles.saveTag}>
                <Text style={styles.saveText}>{h.savings}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.category}>{h.category.toUpperCase()}</Text>
              <Text style={styles.title}>{h.title}</Text>
              <Text style={styles.desc}>{h.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  list: { padding: spacing.xl, paddingBottom: 60, gap: spacing.md },
  card: {
    flexDirection: "row", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg, padding: spacing.lg,
    ...shadows.soft,
  },
  first: { borderWidth: 1.5, borderColor: colors.brandSecondary },
  left: { alignItems: "center", width: 60, gap: spacing.sm },
  icon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  saveTag: { backgroundColor: colors.sunSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  saveText: { fontSize: 10, fontWeight: "800", color: "#7C4A00" },
  category: { fontSize: 10, letterSpacing: 1, fontWeight: "800", color: colors.brandSecondary },
  title: { ...typography.h3, color: colors.onSurface, marginTop: 2 },
  desc: { fontSize: 13, color: colors.onSurfaceMuted, marginTop: 4, lineHeight: 19 },
});
