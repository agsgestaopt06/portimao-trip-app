import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api, ShoppingItem } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

const CATEGORIES: { id: string; label: string; icon: keyof typeof import("@expo/vector-icons/build/Ionicons").default["glyphMap"]; emoji: string }[] = [
  { id: "essenciais", label: "Essenciais", icon: "basket", emoji: "🥛" },
  { id: "praia", label: "Praia", icon: "sunny", emoji: "☀️" },
  { id: "jantares", label: "Jantares leves", icon: "restaurant", emoji: "🍳" },
  { id: "extras", label: "Extras", icon: "add-circle", emoji: "🧴" },
];

export default function Shopping() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [checkedTotal, setCheckedTotal] = useState(0);

  const load = async () => {
    const d = await api.shopping().catch(() => null);
    if (!d) return;
    setItems(d.items);
    setTotal(d.total);
    setCheckedTotal(d.checked_total);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, next: boolean) => {
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, checked: next } : it)));
    try {
      await api.toggleShopping(id, next);
      await load();
    } catch { /* revert not needed for demo */ }
  };

  const openMaps = () => {
    Linking.openURL("https://maps.google.com/?q=Continente+Portim%C3%A3o").catch(() => {});
  };

  const remaining = Math.max(0, total - checkedTotal);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Lista de compras"
        subtitle="Continente Portimão • ~€35 família 3 dias"
        testID="shopping-header"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary card */}
        <View style={styles.summary} testID="shopping-summary">
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryKicker}>ORÇAMENTO ESTIMADO</Text>
            <Text style={styles.summaryValue}>€{remaining.toFixed(2)}</Text>
            <Text style={styles.summarySub}>de €{total.toFixed(2)} total • já no carrinho €{checkedTotal.toFixed(2)}</Text>
          </View>
          <Pressable style={styles.mapsBtn} onPress={openMaps} testID="shopping-maps-btn">
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={styles.mapsBtnText}>Abrir Continente</Text>
          </Pressable>
        </View>

        {/* Hack banner */}
        <View style={styles.hackBanner}>
          <Ionicons name="flash" size={16} color={colors.brandSecondary} />
          <Text style={styles.hackBannerText}>
            <Text style={{ fontWeight: "800" }}>Poupança €80-120 </Text>
            comparado com todas as refeições fora
          </Text>
        </View>

        {/* Categories */}
        {CATEGORIES.map((cat, ci) => {
          const catItems = items.filter((i) => i.category === cat.id);
          if (catItems.length === 0) return null;
          return (
            <View key={cat.id} style={styles.categorySection}>
              <View style={styles.categoryHead}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                <Text style={styles.categoryCount}>
                  {catItems.filter((i) => i.checked).length}/{catItems.length}
                </Text>
              </View>
              {catItems.map((it, i) => (
                <Animated.View key={it.id} entering={FadeInDown.delay(30 * (i + ci * 4))}>
                  <Pressable
                    style={[styles.item, it.checked && styles.itemChecked]}
                    onPress={() => toggle(it.id, !it.checked)}
                    testID={`shop-${it.id}`}
                  >
                    <View style={[styles.checkbox, it.checked && styles.checkboxOn]}>
                      {it.checked && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, it.checked && styles.itemNameChecked]}>{it.name}</Text>
                      {it.note ? <Text style={styles.itemNote}>{it.note}</Text> : null}
                    </View>
                    <Text style={[styles.itemPrice, it.checked && styles.itemPriceChecked]}>
                      €{it.price.toFixed(2)}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          );
        })}

        {items.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={40} color={colors.onSurfaceMuted} />
            <Text style={styles.emptyText}>A carregar a lista...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.medium,
  },
  summaryKicker: { fontSize: 10, letterSpacing: 1, fontWeight: "700", color: colors.brandTertiary },
  summaryValue: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginTop: 4 },
  summarySub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  mapsBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.pill,
  },
  mapsBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  hackBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.brandTerracottaSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  hackBannerText: { flex: 1, fontSize: 12, color: colors.onBrandTerracottaSoft, lineHeight: 18 },
  categorySection: { marginTop: spacing.md },
  categoryHead: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryEmoji: { fontSize: 18 },
  categoryLabel: { flex: 1, ...typography.h3, color: colors.onSurface },
  categoryCount: {
    fontSize: 11, fontWeight: "700",
    color: colors.brandPrimary,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  item: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 6,
    ...shadows.soft,
  },
  itemChecked: { backgroundColor: "#F5F5F5" },
  checkbox: {
    width: 24, height: 24, borderRadius: 8,
    borderWidth: 2, borderColor: colors.borderStrong,
    alignItems: "center", justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.onSurface },
  itemNameChecked: { textDecorationLine: "line-through", color: colors.onSurfaceMuted },
  itemNote: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: "700", color: colors.brandDark },
  itemPriceChecked: { color: colors.onSurfaceMuted },
  empty: { alignItems: "center", padding: spacing["2xl"], gap: spacing.sm },
  emptyText: { color: colors.onSurfaceMuted, fontSize: 13 },
});
