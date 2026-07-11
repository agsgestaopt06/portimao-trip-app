import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { SmartGoSheet } from "@/src/components/SmartGoSheet";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

type Loc = { id: string; name: string; category: string; latitude: number; longitude: number; description: string; icon: string };

const CATEGORY_ORDER = ["Hospedagem", "Praia", "Atividade principal", "Ponto de partida", "Restaurante", "Exploração", "Compras (Hack)"];
const CATEGORY_COLORS: Record<string, string> = {
  "Hospedagem": colors.brandPrimary,
  "Praia": colors.sun,
  "Atividade principal": colors.brandSecondary,
  "Ponto de partida": colors.info,
  "Restaurante": colors.warning,
  "Exploração": colors.success,
  "Compras (Hack)": colors.brandDark,
};

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "Praia", label: "Praias" },
  { id: "Restaurante", label: "Restaurantes" },
  { id: "Atividade principal", label: "Atividades" },
  { id: "Compras (Hack)", label: "Compras" },
];

export default function MapScreen() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [smartGoTo, setSmartGoTo] = useState<string | null>(null);

  useEffect(() => {
    api.mapLocations().then((d: Loc[]) => setLocs(d)).catch(() => {});
  }, []);

  const openInMaps = (l: Loc) => {
    Linking.openURL(`https://maps.google.com/?q=${l.latitude},${l.longitude}`).catch(() => {});
  };

  const filtered = filter === "all" ? locs : locs.filter((l) => l.category === filter);

  // Sort by category
  const sorted = [...filtered].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category);
    const bi = CATEGORY_ORDER.indexOf(b.category);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Mapa da Viagem"
        subtitle="Toca no ícone laranja para Smart Go inteligente"
        testID="map-header"
      />

      {/* Filters */}
      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.chip, filter === f.id && styles.chipActive]}
              onPress={() => setFilter(f.id)}
              testID={`map-filter-${f.id}`}
            >
              <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Path diagram (kept as visual overview) */}
        {filter === "all" && (
          <View style={styles.pathCard} testID="map-diagram">
            <Text style={styles.pathTitle}>Mapa mental • Zona de Portimão</Text>
            <View style={styles.pathNode}>
              <View style={styles.node}><Ionicons name="home" size={16} color="#fff" /></View>
              <Text style={styles.nodeText}>Studio 17 • Base</Text>
            </View>
            <Text style={styles.arrow}>↓ 5-7 min de táxi</Text>
            <View style={styles.pathNode}>
              <View style={[styles.node, { backgroundColor: colors.brandSecondary }]}><Ionicons name="boat" size={16} color="#fff" /></View>
              <Text style={styles.nodeText}>Marina → Barco Benagil</Text>
            </View>
            <Text style={styles.arrow}>↓ curto</Text>
            <View style={styles.pathNode}>
              <View style={[styles.node, { backgroundColor: colors.sun }]}><Ionicons name="sunny" size={16} color="#fff" /></View>
              <Text style={styles.nodeText}>Praia da Rocha • Esplanadas</Text>
            </View>
            <Text style={styles.arrow}>↓ Vai e Vem L14</Text>
            <View style={styles.pathNode}>
              <View style={[styles.node, { backgroundColor: colors.brandDark }]}><Ionicons name="leaf" size={16} color="#fff" /></View>
              <Text style={styles.nodeText}>Alvor (opcional Dia 3)</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          {filter === "all" ? "Todos os locais" : filter}
        </Text>
        {sorted.map((l, i) => (
          <Animated.View key={l.id} entering={FadeInDown.delay(40 * i)}>
            <View style={styles.card} testID={`loc-${l.id}`}>
              <Pressable style={styles.cardMain} onPress={() => openInMaps(l)}>
                <View style={[styles.icon, { backgroundColor: (CATEGORY_COLORS[l.category] || colors.brandTertiary) + "30" }]}>
                  <Ionicons name={l.icon as any} size={18} color={CATEGORY_COLORS[l.category] || colors.brandDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cat}>{l.category.toUpperCase()}</Text>
                  <Text style={styles.name}>{l.name}</Text>
                  <Text style={styles.desc}>{l.description}</Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.smartGoBtn}
                onPress={() => setSmartGoTo(l.id)}
                testID={`loc-smart-${l.id}`}
              >
                <Ionicons name="compass" size={16} color="#fff" />
                <Text style={styles.smartGoText}>Bora lá</Text>
              </Pressable>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {smartGoTo && (
        <SmartGoSheet
          visible={!!smartGoTo}
          fromId="hotel"
          toId={smartGoTo}
          onClose={() => setSmartGoTo(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  filtersWrap: { height: 56, borderBottomWidth: 1, borderBottomColor: colors.border },
  filtersContent: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: "center", height: 56 },
  chip: {
    height: 36,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.onSurfaceMuted },
  chipTextActive: { color: "#fff" },

  content: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  pathCard: { backgroundColor: colors.brandTertiary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  pathTitle: { ...typography.h3, color: colors.brandDark, marginBottom: spacing.sm },
  pathNode: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#fff", borderRadius: radius.md, padding: spacing.md },
  node: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  nodeText: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.onSurface },
  arrow: { textAlign: "center", color: colors.brandDark, fontSize: 12, fontWeight: "600" },
  sectionTitle: { ...typography.h2, color: colors.onSurface, marginTop: spacing.md },

  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    ...shadows.soft,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardMain: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cat: { fontSize: 10, letterSpacing: 1.2, fontWeight: "800", color: colors.brandSecondary },
  name: { ...typography.h3, color: colors.onSurface, marginTop: 2 },
  desc: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  smartGoBtn: {
    alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  smartGoText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
