import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, SmartGoResult } from "@/src/api";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

type Props = {
  visible: boolean;
  fromId: string;
  toId: string;
  onClose: () => void;
};

export function SmartGoSheet({ visible, fromId, toId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<SmartGoResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setData(null);
    api
      .smartGo(fromId, toId)
      .then((d) => setData(d as SmartGoResult))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [visible, fromId, toId]);

  const openMaps = () => {
    if (data?.maps_url) Linking.openURL(data.maps_url).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      onRequestClose={onClose}
      testID="smart-go-modal"
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.duration(300)}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}
          onStartShouldSetResponder={() => true}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>BORA LÁ</Text>
                <Text style={styles.title}>
                  {data ? `${data.from.name} → ${data.to.name}` : "A calcular..."}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} testID="smart-go-close">
                <Ionicons name="close" size={24} color={colors.onSurfaceMuted} />
              </Pressable>
            </View>

            {loading || !data ? (
              <View style={styles.loading}>
                <Ionicons name="compass" size={32} color={colors.brandPrimary} />
                <Text style={styles.loadingText}>A traçar o melhor caminho...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                {/* Distance summary */}
                <Animated.View entering={FadeIn.delay(100)} style={styles.distanceRow}>
                  <View style={styles.distanceCol}>
                    <Text style={styles.distanceValue}>{data.distance_km}</Text>
                    <Text style={styles.distanceLabel}>km</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.distanceCol}>
                    <Text style={styles.distanceValue}>{data.walking.minutes}</Text>
                    <Text style={styles.distanceLabel}>min a pé</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.distanceCol}>
                    <Text style={styles.distanceValue}>€{data.bolt.eur.toFixed(0)}</Text>
                    <Text style={styles.distanceLabel}>bolt ~</Text>
                  </View>
                </Animated.View>

                {/* Options */}
                <Text style={styles.sectionTitle}>Opções de transporte</Text>

                {data.bus && (
                  <Animated.View entering={FadeInDown.delay(150)}>
                    <View style={[styles.option, styles.optionRecommended]} testID="smart-go-bus">
                      <View style={[styles.optionIcon, { backgroundColor: data.bus.color }]}>
                        <Ionicons name="bus" size={22} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.optionTitleRow}>
                          <Text style={styles.optionTitle}>{data.bus.line_name}</Text>
                          {data.bus.direct ? (
                            <View style={styles.badgeGreen}>
                              <Text style={styles.badgeTextGreen}>DIRETO</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.optionSub}>
                          Próximo em <Text style={styles.optionStrong}>{data.bus.minutes_until} min</Text> • {data.bus.next_time}
                        </Text>
                      </View>
                      <Text style={styles.optionPrice}>€1,60</Text>
                    </View>
                  </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(220)}>
                  <Pressable style={styles.option} onPress={openMaps} testID="smart-go-walk">
                    <View style={[styles.optionIcon, { backgroundColor: colors.brandTertiary }]}>
                      <Ionicons name="walk" size={22} color={colors.brandDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>A pé</Text>
                      <Text style={styles.optionSub}>{data.walking.label} • ~{data.distance_km} km</Text>
                    </View>
                    <Text style={styles.optionPrice}>Grátis</Text>
                  </Pressable>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(290)}>
                  <Pressable style={styles.option} onPress={openMaps} testID="smart-go-bolt">
                    <View style={[styles.optionIcon, { backgroundColor: colors.brandTerracottaSoft }]}>
                      <Ionicons name="car" size={22} color={colors.brandSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>Bolt / Táxi</Text>
                      <Text style={styles.optionSub}>{data.bolt.label}</Text>
                    </View>
                    <Text style={styles.optionPrice}>~€{data.bolt.eur}</Text>
                  </Pressable>
                </Animated.View>

                {/* Nearby POIs */}
                {data.nearby.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Também por perto</Text>
                    {data.nearby.map((p, i) => (
                      <Animated.View key={p.id} entering={FadeInDown.delay(360 + i * 60)}>
                        <View style={styles.poi} testID={`smart-go-poi-${p.id}`}>
                          <View style={styles.poiDot}>
                            <Ionicons name={p.icon as any} size={16} color={colors.brandDark} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.poiName}>{p.name}</Text>
                            <Text style={styles.poiCat}>{p.category}</Text>
                          </View>
                          <Text style={styles.poiDist}>{p.distance_km} km</Text>
                        </View>
                      </Animated.View>
                    ))}
                  </>
                )}

                {/* Open in Maps */}
                <Pressable style={styles.cta} onPress={openMaps} testID="smart-go-open-maps">
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.ctaText}>Abrir no Google Maps</Text>
                </Pressable>
              </ScrollView>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    ...shadows.medium,
  },
  grabber: {
    alignSelf: "center",
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.md,
    marginBottom: spacing.lg,
  },
  kicker: { ...typography.overline, color: colors.brandSecondary },
  title: { ...typography.h2, color: colors.onSurface, marginTop: 4 },
  loading: { alignItems: "center", padding: spacing["2xl"], gap: spacing.md },
  loadingText: { color: colors.onSurfaceMuted, fontSize: 13 },
  distanceRow: {
    flexDirection: "row",
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  distanceCol: { flex: 1, alignItems: "center" },
  distanceValue: { fontSize: 26, fontWeight: "800", color: colors.brandDark, letterSpacing: -0.5 },
  distanceLabel: { fontSize: 11, color: colors.brandDark, marginTop: 2, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: "600" },
  divider: { width: 1, backgroundColor: "rgba(17,77,80,0.15)" },
  sectionTitle: { ...typography.overline, color: colors.onSurfaceMuted, marginTop: spacing.md, marginBottom: spacing.sm },
  option: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  optionRecommended: {
    borderColor: colors.brandPrimary,
    backgroundColor: "rgba(29,128,134,0.05)",
  },
  optionIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  optionTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  optionSub: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  optionStrong: { color: colors.brandPrimary, fontWeight: "800" },
  optionPrice: { fontSize: 13, fontWeight: "700", color: colors.brandDark },
  badgeGreen: {
    backgroundColor: colors.success,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill,
  },
  badgeTextGreen: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  poi: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    marginBottom: 6,
  },
  poiDot: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  poiName: { fontSize: 13, fontWeight: "600", color: colors.onSurface },
  poiCat: { fontSize: 10, color: colors.onSurfaceMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  poiDist: { fontSize: 12, fontWeight: "700", color: colors.brandPrimary },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
