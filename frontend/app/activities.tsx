import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api, Attraction } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

const CATEGORY_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "kids", label: "Kids" },
  { id: "adventure", label: "Aventura" },
  { id: "culture", label: "Cultura" },
  { id: "free", label: "Grátis" },
];

export default function Activities() {
  const [items, setItems] = useState<Attraction[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { api.attractions().then(setItems).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "kids") return items.filter((a) => a.kids);
    if (filter === "adventure") return items.filter((a) => ["Aventura", "Marítimo", "Trilho"].includes(a.category));
    if (filter === "culture") return items.filter((a) => ["Cultura", "História", "Miradouro", "Vila típica"].includes(a.category));
    if (filter === "free") return items.filter((a) => a.price.toLowerCase().includes("gr"));
    return items;
  }, [items, filter]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Atividades & Atracções" subtitle={`${items.length} experiências em Portimão e arredores`} testID="attractions-header" />

      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {CATEGORY_FILTERS.map((f) => (
            <Pressable key={f.id} style={[styles.chip, filter === f.id && styles.chipActive]} onPress={() => setFilter(f.id)} testID={`act-filter-${f.id}`}>
              <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((a, i) => (
          <Animated.View key={a.id} entering={FadeInDown.delay(50 * i)}>
            <View style={styles.card} testID={`act-${a.id}`}>
              <View style={styles.imgWrap}>
                <Image source={{ uri: a.image_url }} style={styles.img} contentFit="cover" />
                <View style={styles.catBadge}>
                  <Text style={styles.catText}>{a.category}</Text>
                </View>
                {a.kids && (
                  <View style={styles.kidsBadge}>
                    <Ionicons name="happy" size={11} color="#fff" />
                    <Text style={styles.kidsText}>KIDS</Text>
                  </View>
                )}
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={11} color={colors.sun} />
                  <Text style={styles.ratingText}>{a.rating.toFixed(1)}</Text>
                </View>
              </View>
              <View style={styles.body}>
                <Text style={styles.name}>{a.name}</Text>
                <Text style={styles.tagline}>{a.tagline}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons name="pricetag" size={11} color={colors.brandDark} />
                    <Text style={styles.metaText}>{a.price}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="time" size={11} color={colors.brandDark} />
                    <Text style={styles.metaText}>{a.hours}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons name="hourglass" size={11} color={colors.brandDark} />
                    <Text style={styles.metaText}>{a.duration}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="location" size={11} color={colors.brandDark} />
                    <Text style={styles.metaText}>{a.distance_km} km</Text>
                  </View>
                </View>
                <Text style={styles.highlights}>{a.highlights}</Text>
                <View style={styles.tipBox}>
                  <Ionicons name="bulb" size={13} color={colors.brandSecondary} />
                  <Text style={styles.tipText}>{a.family_tip}</Text>
                </View>
                <View style={styles.footRow}>
                  <Pressable
                    style={styles.mapsBtn}
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${a.lat},${a.lng}`).catch(() => {})}
                    testID={`act-map-${a.id}`}
                  >
                    <Ionicons name="map" size={14} color="#fff" />
                    <Text style={styles.mapsText}>Abrir no mapa</Text>
                  </Pressable>
                  {a.book_url && (
                    <Pressable
                      style={styles.bookBtn}
                      onPress={() => Linking.openURL(a.book_url!).catch(() => {})}
                      testID={`act-book-${a.id}`}
                    >
                      <Ionicons name="ticket" size={14} color={colors.brandPrimary} />
                      <Text style={styles.bookText}>Reservar</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  filtersWrap: { height: 56, borderBottomWidth: 1, borderBottomColor: colors.border },
  filtersContent: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: "center", height: 56 },
  chip: { height: 36, paddingHorizontal: spacing.md, justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.onSurfaceMuted },
  chipTextActive: { color: "#fff" },
  list: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, overflow: "hidden", ...shadows.soft },
  imgWrap: { position: "relative" },
  img: { width: "100%", height: 180, backgroundColor: colors.surfaceTertiary },
  catBadge: { position: "absolute", top: 10, left: 10, backgroundColor: "rgba(255,255,255,0.9)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  catText: { fontSize: 10, fontWeight: "700", color: colors.brandDark, letterSpacing: 0.5, textTransform: "uppercase" },
  ratingBadge: { position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  ratingText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  kidsBadge: { position: "absolute", bottom: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.brandSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  kidsText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  body: { padding: spacing.lg, gap: spacing.sm },
  name: { ...typography.h3, color: colors.onSurface },
  tagline: { fontSize: 12, color: colors.onSurfaceMuted, fontStyle: "italic" },
  metaRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  metaText: { fontSize: 11, fontWeight: "600", color: colors.brandDark },
  highlights: { fontSize: 12, color: colors.onSurfaceTertiary, lineHeight: 17, marginTop: 2 },
  tipBox: { flexDirection: "row", gap: 6, backgroundColor: colors.sunSoft, borderRadius: radius.md, padding: spacing.sm },
  tipText: { flex: 1, fontSize: 12, color: colors.onBrandTerracottaSoft, lineHeight: 17, fontWeight: "500" },
  footRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  mapsBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: colors.brandPrimary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.pill },
  mapsText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  bookBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: colors.brandTertiary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.pill },
  bookText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 12 },
});
