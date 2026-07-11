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

import { api, Beach } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { SmartGoSheet } from "@/src/components/SmartGoSheet";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "kids", label: "Ideais crianças" },
  { id: "close", label: "Perto do hotel" },
  { id: "icons", label: "Icónicas" },
];

export default function Beaches() {
  const [items, setItems] = useState<Beach[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [smartGoTo, setSmartGoTo] = useState<string | null>(null);

  useEffect(() => { api.beaches().then(setItems).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "kids") return items.filter((b) => b.kids_score >= 4);
    if (filter === "close") return items.filter((b) => b.distance_from_hotel_km <= 5);
    if (filter === "icons") return items.filter((b) => b.rating >= 4.7);
    return items;
  }, [items, filter]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Praias" subtitle={`${items.length} praias com fotos, tips e Smart Go`} testID="beaches-header" />
      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.chip, filter === f.id && styles.chipActive]}
              onPress={() => setFilter(f.id)}
              testID={`beach-filter-${f.id}`}
            >
              <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((b, i) => (
          <Animated.View key={b.id} entering={FadeInDown.delay(60 * i)}>
            <View style={styles.card} testID={`beach-${b.id}`}>
              <View style={styles.imgWrap}>
                <Image source={{ uri: b.image_url }} style={styles.img} contentFit="cover" />
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={11} color={colors.sun} />
                  <Text style={styles.ratingText}>{b.rating.toFixed(1)}</Text>
                  <Text style={styles.reviewsText}> · {b.reviews.toLocaleString("pt-PT")}</Text>
                </View>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{b.type}</Text>
                </View>
                {b.kids_score >= 4 && (
                  <View style={styles.kidsBadge}>
                    <Ionicons name="happy" size={11} color="#fff" />
                    <Text style={styles.kidsBadgeText}>KIDS</Text>
                  </View>
                )}
              </View>
              <View style={styles.body}>
                <Text style={styles.name}>{b.name}</Text>
                <Text style={styles.tagline}>{b.tagline}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons name="walk" size={12} color={colors.brandDark} />
                    <Text style={styles.metaText}>{b.walk_min < 60 ? `${b.walk_min} min a pé` : `${(b.walk_min/60).toFixed(1)}h a pé`}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="location" size={12} color={colors.brandDark} />
                    <Text style={styles.metaText}>{b.distance_from_hotel_km} km</Text>
                  </View>
                </View>
                <View style={styles.tipBox}>
                  <Ionicons name="bulb" size={13} color={colors.brandSecondary} />
                  <Text style={styles.tipText}>{b.family_tip}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }} contentContainerStyle={{ gap: 6, paddingRight: spacing.xl }}>
                  {b.amenities.map((a, ai) => (
                    <View key={ai} style={styles.amBadge}>
                      <Text style={styles.amText}>{a}</Text>
                    </View>
                  ))}
                </ScrollView>
                {b.hazards ? (
                  <View style={styles.hazardBox}>
                    <Ionicons name="warning" size={13} color={colors.error} />
                    <Text style={styles.hazardText}>{b.hazards}</Text>
                  </View>
                ) : null}
                <View style={styles.footRow}>
                  <Pressable
                    style={styles.boraBtn}
                    onPress={() => setSmartGoTo(b.location_id)}
                    testID={`beach-bora-${b.id}`}
                  >
                    <Ionicons name="compass" size={14} color="#fff" />
                    <Text style={styles.boraText}>Bora lá!</Text>
                  </Pressable>
                  <Pressable
                    style={styles.mapsBtn}
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${b.lat},${b.lng}`).catch(() => {})}
                  >
                    <Ionicons name="map" size={14} color={colors.brandPrimary} />
                    <Text style={styles.mapsText}>Maps</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {smartGoTo && (
        <SmartGoSheet visible={!!smartGoTo} fromId="hotel" toId={smartGoTo} onClose={() => setSmartGoTo(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  filtersWrap: { height: 56, borderBottomWidth: 1, borderBottomColor: colors.border },
  filtersContent: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: "center", height: 56 },
  chip: {
    height: 36, paddingHorizontal: spacing.md, justifyContent: "center",
    borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.border, flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.onSurfaceMuted },
  chipTextActive: { color: "#fff" },
  list: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, overflow: "hidden", ...shadows.soft },
  imgWrap: { position: "relative" },
  img: { width: "100%", height: 200, backgroundColor: colors.surfaceTertiary },
  ratingBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill,
  },
  ratingText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  reviewsText: { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "500" },
  typeBadge: { position: "absolute", top: 10, left: 10, backgroundColor: "rgba(255,255,255,0.9)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  typeBadgeText: { fontSize: 10, fontWeight: "700", color: colors.brandDark, letterSpacing: 0.3 },
  kidsBadge: { position: "absolute", bottom: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.brandSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  kidsBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  body: { padding: spacing.lg, gap: spacing.sm },
  name: { ...typography.h3, color: colors.onSurface },
  tagline: { fontSize: 12, color: colors.onSurfaceMuted, fontStyle: "italic", marginTop: -2 },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: 2 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  metaText: { fontSize: 11, fontWeight: "600", color: colors.brandDark },
  tipBox: { flexDirection: "row", gap: 6, backgroundColor: colors.sunSoft, borderRadius: radius.md, padding: spacing.sm },
  tipText: { flex: 1, fontSize: 12, color: colors.onBrandTerracottaSoft, lineHeight: 17, fontWeight: "500" },
  amBadge: { backgroundColor: colors.brandTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  amText: { fontSize: 10, fontWeight: "600", color: colors.brandDark },
  hazardBox: { flexDirection: "row", gap: 6, backgroundColor: colors.brandTerracottaSoft, borderRadius: radius.md, padding: spacing.sm, marginTop: 4 },
  hazardText: { flex: 1, fontSize: 11, color: colors.error, lineHeight: 15, fontWeight: "500" },
  footRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  boraBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.brandPrimary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  boraText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  mapsBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.brandTertiary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  mapsText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 12 },
});
