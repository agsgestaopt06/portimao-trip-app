import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { SmartGoSheet } from "@/src/components/SmartGoSheet";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

type Menu = { name: string; price: string };
type R = {
  id: string;
  name: string;
  type: string;
  price_range: string;
  price_avg: number;
  rating: number;
  reviews: number | null;
  highlights: string;
  recommended_for: string;
  image_key: string;
  image_url: string;
  menu: Menu[];
  promo: string | null;
  tags: string[];
  location_id: string;
  distance_km: number;
  walk_min: number;
};

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "kids-friendly", label: "Kids-friendly" },
  { id: "vista-mar", label: "Vista mar" },
  { id: "cheap", label: "Até €15/pax" },
  { id: "vegetariano", label: "Vegetariano" },
  { id: "hack", label: "🎯 Poupança" },
];

export default function Restaurants() {
  const [items, setItems] = useState<R[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [smartGoTo, setSmartGoTo] = useState<string | null>(null);

  useEffect(() => {
    api.restaurants().then((d: any) => setItems(d)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "cheap") return items.filter((r) => r.price_avg <= 15);
    return items.filter((r) => r.tags.includes(filter));
  }, [items, filter]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Restaurantes"
        subtitle="Fotos, menus, preços reais e promoções"
        testID="restaurants-header"
      />

      {/* Filters (horizontal chip row) */}
      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.chip, filter === f.id && styles.chipActive]}
              onPress={() => setFilter(f.id)}
              testID={`rest-filter-${f.id}`}
            >
              <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((r, i) => {
          const isOpen = expanded === r.id;
          return (
            <Animated.View key={r.id} entering={FadeInDown.delay(60 * i)}>
              <Pressable
                style={[styles.card, r.id === "self-catering" && styles.hackCard]}
                onPress={() => setExpanded(isOpen ? null : r.id)}
                testID={`rest-${r.id}`}
              >
                {/* Hero image */}
                <View style={styles.imageWrap}>
                  <Image source={{ uri: r.image_url }} style={styles.image} contentFit="cover" />
                  {r.promo ? (
                    <View style={styles.promoBadge}>
                      <Ionicons name="pricetag" size={11} color="#fff" />
                      <Text style={styles.promoText}>PROMO</Text>
                    </View>
                  ) : null}
                  {r.rating ? (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color={colors.sun} />
                      <Text style={styles.ratingText}>
                        {r.rating.toFixed(1)}
                        {r.reviews ? <Text style={styles.reviewText}> · {r.reviews}</Text> : null}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Info */}
                <View style={{ padding: spacing.lg, gap: spacing.sm }}>
                  <View style={styles.headRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, r.id === "self-catering" && { color: "#fff" }]}>{r.name}</Text>
                      <Text style={[styles.type, r.id === "self-catering" && { color: "rgba(255,255,255,0.75)" }]}>{r.type}</Text>
                    </View>
                    <View style={styles.priceTag}>
                      <Text style={styles.priceText}>{r.price_range}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="walk" size={12} color={colors.brandDark} />
                      <Text style={styles.metaText}>{r.walk_min} min a pé</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="location" size={12} color={colors.brandDark} />
                      <Text style={styles.metaText}>{r.distance_km} km</Text>
                    </View>
                  </View>

                  {r.promo ? (
                    <View style={styles.promoRow}>
                      <Ionicons name="flash" size={13} color={colors.brandSecondary} />
                      <Text style={styles.promoLine}>{r.promo}</Text>
                    </View>
                  ) : null}

                  <Text style={[styles.highlights, r.id === "self-catering" && { color: "rgba(255,255,255,0.85)" }]}>{r.highlights}</Text>

                  {/* Expanded: menu */}
                  {isOpen && r.menu && r.menu.length > 0 && (
                    <View style={styles.menuBlock}>
                      <Text style={styles.menuKicker}>MENU DESTAQUE</Text>
                      {r.menu.map((m, mi) => (
                        <View key={mi} style={styles.menuItem}>
                          <Text style={[styles.menuName, r.id === "self-catering" && { color: "#fff" }]}>• {m.name}</Text>
                          <Text style={[styles.menuPrice, r.id === "self-catering" && { color: colors.brandTertiary }]}>{m.price}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.footRow}>
                    <Pressable
                      style={styles.boraBtn}
                      onPress={() => setSmartGoTo(r.location_id)}
                      testID={`rest-bora-${r.id}`}
                    >
                      <Ionicons name="compass" size={16} color="#fff" />
                      <Text style={styles.boraText}>Bora lá!</Text>
                    </Pressable>
                    <Text style={[styles.rec, r.id === "self-catering" && { color: colors.brandTertiary }]}>
                      {r.recommended_for}
                    </Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={r.id === "self-catering" ? colors.brandTertiary : colors.onSurfaceMuted}
                    />
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={40} color={colors.onSurfaceMuted} />
            <Text style={styles.emptyText}>Sem resultados para este filtro</Text>
          </View>
        )}
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
  filtersWrap: { height: 56, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  filtersContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
    height: 56,
  },
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

  list: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.soft,
  },
  hackCard: { backgroundColor: colors.brandDark },
  imageWrap: { width: "100%", height: 160, position: "relative", backgroundColor: colors.surfaceTertiary },
  image: { width: "100%", height: "100%" },
  promoBadge: {
    position: "absolute", top: 10, left: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  promoText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  ratingBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  ratingText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  reviewText: { color: "rgba(255,255,255,0.7)", fontWeight: "500" },

  headRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  name: { ...typography.h3, color: colors.onSurface },
  type: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  priceTag: { backgroundColor: colors.brandTertiary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  priceText: { fontSize: 11, fontWeight: "700", color: colors.brandDark },
  metaRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  metaText: { fontSize: 11, fontWeight: "600", color: colors.brandDark },
  promoRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.brandTerracottaSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  promoLine: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.onBrandTerracottaSoft, lineHeight: 16 },
  highlights: { fontSize: 13, color: colors.onSurfaceTertiary, lineHeight: 19 },

  menuBlock: {
    backgroundColor: "rgba(29,128,134,0.06)",
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  menuKicker: { fontSize: 10, letterSpacing: 1, fontWeight: "700", color: colors.brandDark, marginBottom: 4 },
  menuItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  menuName: { fontSize: 13, color: colors.onSurface, flex: 1 },
  menuPrice: { fontSize: 13, fontWeight: "700", color: colors.brandDark },

  footRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  boraBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  boraText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  rec: { flex: 1, fontSize: 11, fontWeight: "600", color: colors.brandSecondary, textAlign: "right" },

  empty: { alignItems: "center", padding: spacing["2xl"], gap: spacing.sm },
  emptyText: { color: colors.onSurfaceMuted, fontSize: 13 },
});
