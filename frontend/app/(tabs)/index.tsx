import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Briefing, BusNext, Weather } from "@/src/api";
import { SmartGoSheet } from "@/src/components/SmartGoSheet";
import { useCountdown } from "@/src/countdown";
import { colors, images, radius, shadows, spacing, typography } from "@/src/theme";

type Trip = {
  destination: string;
  start_date: string;
  end_date: string;
  family: string[];
  hotel_name: string;
  hotel_address: string;
  check_in: string;
  check_out: string;
  budget_min: number;
  budget_max: number;
};

const QUICK_ACTIONS: {
  id: string;
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  tint: string;
}[] = [
  { id: "shopping", label: "Compras", sub: "Lista Continente", icon: "cart", route: "/shopping", tint: colors.brandTertiary },
  { id: "tickets", label: "Bilhetes", sub: "FlixBus + hotel", icon: "ticket", route: "/tickets", tint: colors.brandTerracottaSoft },
  { id: "map", label: "Mapa", sub: "Locais + Smart Go", icon: "map", route: "/map", tint: colors.sunSoft },
  { id: "budget", label: "Orçamento", sub: "€250-290 hack", icon: "wallet", route: "/budget", tint: colors.brandTerracottaSoft },
  { id: "checklist", label: "Checklist", sub: "20 itens", icon: "checkbox", route: "/checklist", tint: colors.sunSoft },
  { id: "hacks", label: "Hacks", sub: "8 segredos", icon: "flash", route: "/hacks", tint: colors.brandTertiary },
];

const HERO_IMAGES = [images.hero, images.benagil, images.praia];

export default function Home() {
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [nextBus, setNextBus] = useState<BusNext[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const [smartGo, setSmartGo] = useState<{ from: string; to: string } | null>(null);

  const cd = useCountdown();

  // Force re-render every second for countdown
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Rotate hero image every 6s
  useEffect(() => {
    const t = setInterval(() => setHeroIdx((n) => (n + 1) % HERO_IMAGES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const [t, b, w, bn] = await Promise.all([
        api.trip(),
        api.briefings().catch(() => ({ items: [], now: "" })),
        api.weather().catch(() => null),
        api.busNext("hotel").catch(() => ({ stop: null, buses: [], now: "" })),
      ]);
      setTrip(t);
      setBriefings((b as any).items || []);
      setWeather(w as Weather | null);
      setNextBus((bn as any).buses || []);
    } catch (e) {
      console.log("home load", e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Pulsing countdown scale
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 500 }), withTiming(1, { duration: 500 })), -1, false);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // Floating boat icon in hero
  const boatY = useSharedValue(0);
  useEffect(() => {
    boatY.value = withRepeat(withSequence(withTiming(-6, { duration: 1400 }), withTiming(0, { duration: 1400 })), -1, false);
  }, [boatY]);
  const boatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: boatY.value }] }));

  const weatherLabel = useMemo(() => {
    if (!weather?.current_temp && !weather?.temp_max) return "Portimão • 28–32°C";
    const min = weather.temp_min ?? "-";
    const max = weather.temp_max ?? "-";
    return `Portimão • ${Math.round(Number(min))}–${Math.round(Number(max))}°C`;
  }, [weather]);

  const uvWarn = weather?.uv_max && weather.uv_max >= 8;

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        testID="home-scroll"
      >
        {/* Hero with countdown */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]} testID="home-hero">
          <Animated.View
            key={heroIdx}
            entering={FadeIn.duration(900)}
            style={StyleSheet.absoluteFill}
          >
            <Image source={{ uri: HERO_IMAGES[heroIdx] }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.35)", "rgba(28,28,30,0.85)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTop}>
            <Pressable
              style={[styles.pill, uvWarn && styles.pillWarn]}
              onPress={() => router.push("/hacks" as any)}
              testID="home-weather-pill"
            >
              <Ionicons name={uvWarn ? "warning" : "sunny"} size={14} color={colors.sun} />
              <Text style={styles.pillText}>
                {weatherLabel}{weather?.uv_max ? ` • UV ${Math.round(weather.uv_max)}` : ""}
              </Text>
            </Pressable>
            <Text style={styles.heroKicker}>OLÁ, FAMÍLIA SACRAMENTO</Text>
            <View style={styles.titleRow}>
              <Text style={styles.heroTitle}>Portimão{"\n"}Verão &apos;26</Text>
              <Animated.View style={[styles.boatFloat, boatStyle]}>
                <Ionicons name="boat" size={30} color="rgba(255,255,255,0.9)" />
              </Animated.View>
            </View>
            <Text style={styles.heroSub}>12–15 Julho • Praia da Rocha + Benagil</Text>
          </View>

          <View style={styles.countdownRow} testID="home-countdown">
            {cd.past ? (
              <Text style={styles.pastText}>🌊 A viagem começou! Aproveitem cada momento.</Text>
            ) : (
              <>
                <CountBox value={cd.days} label="dias" pulseStyle={pulseStyle} />
                <CountBox value={cd.hours} label="horas" />
                <CountBox value={cd.minutes} label="min" />
                <CountBox value={cd.seconds} label="seg" pulseStyle={pulseStyle} />
              </>
            )}
          </View>
        </View>

        {/* Briefings (contextual reminders) */}
        {briefings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alertas inteligentes</Text>
            <View style={{ gap: spacing.md }}>
              {briefings.map((b, i) => (
                <Animated.View key={b.id} entering={FadeInDown.delay(80 * i).duration(400)}>
                  <BriefingCard b={b} onSmartGo={setSmartGo} />
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* Next bus widget */}
        {nextBus.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Próximos autocarros — paragem do hotel</Text>
              <Pressable onPress={() => setSmartGo({ from: "hotel", to: "praia-rocha" })} testID="home-open-bus">
                <Text style={styles.linkText}>Smart Go →</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.xl }}>
              {nextBus.slice(0, 5).map((bs, i) => (
                <Animated.View key={bs.line_id} entering={FadeInDown.delay(60 * i)}>
                  <View style={[styles.busCard, { borderLeftColor: bs.color }]} testID={`bus-${bs.line_id}`}>
                    <Text style={styles.busLineName}>{bs.line_name}</Text>
                    <Text style={styles.busMin}>
                      {bs.minutes_until != null ? `${bs.minutes_until} min` : "—"}
                    </Text>
                    <Text style={styles.busTime}>{bs.next_time}</Text>
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Family strip */}
        <View style={styles.familyStrip} testID="home-family">
          <View style={styles.familyIcon}>
            <Ionicons name="people" size={18} color={colors.brandDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.familyLine}>{trip?.family?.join(" • ") ?? "Alex • Priscila • Alexsandro • Arthur"}</Text>
            <Text style={styles.familySub}>2 adultos + 2 crianças (11 & 5)</Text>
          </View>
        </View>

        {/* Today card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>A tua próxima etapa</Text>
          <Pressable style={styles.nextCard} onPress={() => router.push("/tickets" as any)} testID="home-next-card">
            <View style={styles.nextIcon}>
              <Ionicons name="bus" size={22} color={colors.onBrandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextKicker}>DOMINGO 12 JUL • 16:05</Text>
              <Text style={styles.nextTitle}>FlixBus • Lisboa → Portimão</Text>
              <Text style={styles.nextSub}>3h10 direto • Chegada 19:15 • €76,91 família</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.onSurfaceMuted} />
          </Pressable>
        </View>

        {/* Quick actions grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atalhos</Text>
          <View style={styles.grid}>
            {QUICK_ACTIONS.map((q, i) => (
              <Animated.View key={q.id} entering={FadeInDown.delay(60 * i)} style={styles.gridCardWrap}>
                <Pressable style={styles.gridCard} onPress={() => router.push(q.route as any)} testID={`home-quick-${q.id}`}>
                  <View style={[styles.gridIcon, { backgroundColor: q.tint }]}>
                    <Ionicons name={q.icon} size={22} color={colors.brandDark} />
                  </View>
                  <Text style={styles.gridLabel}>{q.label}</Text>
                  <Text style={styles.gridSub}>{q.sub}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Daily hack */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hack de ouro</Text>
          <View style={styles.hackCard} testID="home-hack">
            <View style={styles.hackBadge}>
              <Ionicons name="flash" size={14} color={colors.onBrandSecondary} />
              <Text style={styles.hackBadgeText}>POUPANÇA €80-120</Text>
            </View>
            <Text style={styles.hackTitle}>Cozinha do Studio 17</Text>
            <Text style={styles.hackBody}>
              Assim que chegarem, passem no Continente e comprem leite, pão, fruta, iogurtes, queijo, fiambre e água. Poupam €80-120 na viagem inteira.
            </Text>
            <Pressable onPress={() => router.push("/shopping" as any)} style={styles.hackLink}>
              <Text style={styles.hackLinkText}>Ver lista de compras completa</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.brandPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Hotel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Casa em Portimão</Text>
          <View style={styles.hotelCard} testID="home-hotel">
            <Image source={{ uri: images.marina }} style={styles.hotelImg} contentFit="cover" />
            <View style={{ padding: spacing.lg }}>
              <Text style={styles.hotelName}>{trip?.hotel_name ?? "Studio 17 by Atlantichotels"}</Text>
              <Text style={styles.hotelAddr}>{trip?.hotel_address}</Text>
              <View style={styles.hotelRow}>
                <View style={styles.hotelCol}>
                  <Text style={styles.hotelKicker}>CHECK-IN</Text>
                  <Text style={styles.hotelValue}>{trip?.check_in ?? "12 Jul • ~16:00"}</Text>
                </View>
                <View style={styles.hotelDivider} />
                <View style={styles.hotelCol}>
                  <Text style={styles.hotelKicker}>CHECK-OUT</Text>
                  <Text style={styles.hotelValue}>{trip?.check_out ?? "15 Jul • 11:00"}</Text>
                </View>
              </View>
              <Pressable
                style={styles.hotelSmartGo}
                onPress={() => setSmartGo({ from: "hotel", to: "praia-rocha" })}
                testID="hotel-smart-go"
              >
                <Ionicons name="compass" size={16} color={colors.brandPrimary} />
                <Text style={styles.hotelSmartGoText}>Bora lá! Smart Go a partir do hotel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {smartGo && (
        <SmartGoSheet
          visible={!!smartGo}
          fromId={smartGo.from}
          toId={smartGo.to}
          onClose={() => setSmartGo(null)}
        />
      )}
    </>
  );
}

function BriefingCard({ b, onSmartGo }: { b: Briefing; onSmartGo: (v: { from: string; to: string }) => void }) {
  const tone = b.tone;
  const bg = tone === "warning" ? colors.sunSoft : tone === "brand" ? colors.brandTertiary : tone === "danger" ? colors.brandTerracottaSoft : "#EEF3F5";
  const iconColor = tone === "warning" ? colors.brandSecondary : tone === "brand" ? colors.brandDark : tone === "danger" ? colors.error : colors.brandPrimary;

  const onPress = () => {
    if (b.cta?.smart_go) onSmartGo(b.cta.smart_go);
    else if (b.cta?.route) router.push(b.cta.route as any);
  };

  return (
    <Pressable style={[styles.briefing, { backgroundColor: bg }]} onPress={onPress} testID={`briefing-${b.id}`}>
      <View style={[styles.briefingIcon, { backgroundColor: "rgba(255,255,255,0.85)" }]}>
        <Ionicons name={b.icon as any} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.briefingHead}>
          <Text style={styles.briefingTitle}>{b.title}</Text>
          <Text style={styles.briefingWhen}>{b.when}</Text>
        </View>
        <Text style={styles.briefingBody}>{b.body}</Text>
        {b.cta && (
          <View style={styles.briefingCta}>
            <Text style={styles.briefingCtaText}>{b.cta.label}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.brandPrimary} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function CountBox({ value, label, pulseStyle }: { value: number; label: string; pulseStyle?: any }) {
  return (
    <Animated.View style={[styles.countBox, pulseStyle]}>
      <Text style={styles.countValue}>{String(value).padStart(2, "0")}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  hero: {
    minHeight: 380,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: "space-between",
    overflow: "hidden",
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroTop: { gap: spacing.md },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pillWarn: { backgroundColor: "rgba(217,108,78,0.35)", borderColor: "rgba(217,108,78,0.6)" },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  heroKicker: { color: "rgba(255,255,255,0.85)", fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  titleRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  heroTitle: { color: "#fff", fontSize: 44, fontWeight: "800", lineHeight: 48, letterSpacing: -1, flex: 1 },
  boatFloat: { marginBottom: 8 },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "500" },
  countdownRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  countBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  countValue: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  countLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  pastText: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center", paddingVertical: spacing.md },
  familyStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  familyIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
  },
  familyLine: { color: colors.brandDark, fontWeight: "700", fontSize: 13 },
  familySub: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing["2xl"] },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  sectionTitle: { ...typography.h2, color: colors.onSurface, marginBottom: spacing.md },
  linkText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 13 },
  briefing: {
    flexDirection: "row", gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.soft,
  },
  briefingIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  briefingHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  briefingTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface, flex: 1 },
  briefingWhen: { fontSize: 10, color: colors.onSurfaceMuted, fontWeight: "600" },
  briefingBody: { fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 4, lineHeight: 17 },
  briefingCta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm },
  briefingCtaText: { fontSize: 12, fontWeight: "700", color: colors.brandPrimary },
  busCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    minWidth: 150,
    ...shadows.soft,
  },
  busLineName: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceMuted, letterSpacing: 0.3 },
  busMin: { fontSize: 24, fontWeight: "800", color: colors.onSurface, marginTop: 4, letterSpacing: -0.5 },
  busTime: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 2 },
  nextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.soft,
  },
  nextIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center",
  },
  nextKicker: { fontSize: 10, letterSpacing: 1.2, fontWeight: "700", color: colors.brandSecondary },
  nextTitle: { ...typography.h3, color: colors.onSurface, marginTop: 2 },
  nextSub: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  gridCardWrap: { width: "47.5%" },
  gridCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.soft,
  },
  gridIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  gridLabel: { ...typography.h3, color: colors.onSurface },
  gridSub: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 2 },
  hackCard: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.medium,
  },
  hackBadge: {
    alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  hackBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  hackTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  hackBody: { color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  hackLink: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: spacing.lg,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.pill,
  },
  hackLinkText: { color: colors.brandTertiary, fontWeight: "700", fontSize: 13 },
  hotelCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, overflow: "hidden", ...shadows.soft },
  hotelImg: { width: "100%", height: 140 },
  hotelName: { ...typography.h3, color: colors.onSurface },
  hotelAddr: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 4, lineHeight: 18 },
  hotelRow: { flexDirection: "row", marginTop: spacing.md, alignItems: "center" },
  hotelCol: { flex: 1 },
  hotelKicker: { fontSize: 10, letterSpacing: 1, fontWeight: "700", color: colors.brandSecondary },
  hotelValue: { fontSize: 14, fontWeight: "700", color: colors.onSurface, marginTop: 3 },
  hotelDivider: { width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: spacing.md },
  hotelSmartGo: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.brandTertiary,
    paddingVertical: 10, paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  hotelSmartGoText: { fontSize: 12, fontWeight: "700", color: colors.brandDark },
});
