import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

type K = { id: string; title: string; description: string; icon: string; age_range: string };

export default function KidsActivities() {
  const [items, setItems] = useState<K[]>([]);
  useEffect(() => { api.kidsActivities().then(setItems).catch(() => {}); }, []);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Atividades Crianças" subtitle="Para o Alexsandro (11) e o Arthur (5)" testID="kids-header" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.safety} testID="kids-safety">
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
          <Text style={styles.safetyText}>Protetor FPS50+ • Chapéu • Água a cada 30min • Zona vigiada por nadadores-salvadores</Text>
        </View>

        {items.map((k) => (
          <View key={k.id} style={styles.card} testID={`kids-${k.id}`}>
            <View style={styles.icon}>
              <Ionicons name={k.icon as any} size={22} color={colors.brandDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{k.title}</Text>
              <Text style={styles.desc}>{k.description}</Text>
              <View style={styles.tag}>
                <Ionicons name="people" size={11} color={colors.brandSecondary} />
                <Text style={styles.tagText}>{k.age_range}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  safety: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.brandSecondary, borderRadius: radius.lg, padding: spacing.lg },
  safetyText: { flex: 1, color: "#fff", fontSize: 12, fontWeight: "600", lineHeight: 17 },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadows.soft },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.sunSoft, alignItems: "center", justifyContent: "center" },
  title: { ...typography.h3, color: colors.onSurface },
  desc: { fontSize: 13, color: colors.onSurfaceMuted, marginTop: 4, lineHeight: 18 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm, alignSelf: "flex-start", backgroundColor: colors.brandTerracottaSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  tagText: { fontSize: 10, fontWeight: "700", color: colors.onBrandTerracottaSoft },
});
