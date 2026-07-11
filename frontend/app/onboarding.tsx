import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, images, radius, spacing } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const { width, height } = Dimensions.get("window");

type Slide = {
  key: string;
  bg: string;
  kicker: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  chips?: { label: string; icon: keyof typeof Ionicons.glyphMap }[];
};

const SLIDES: Slide[] = [
  {
    key: "welcome",
    bg: images.hero,
    kicker: "PORTIMÃO • VERÃO '26",
    title: "Olá, Família Sacramento!",
    body: "A vossa viagem de 4 dias à Praia da Rocha, planeada ao milímetro por um guia local que sabe todos os hacks do Algarve.",
    icon: "sparkles",
    chips: [
      { label: "12-15 Julho", icon: "calendar" },
      { label: "4 pessoas", icon: "people" },
      { label: "€250-290", icon: "wallet" },
    ],
  },
  {
    key: "smart-go",
    bg: images.benagil,
    kicker: "SMART GO",
    title: "Toca em qualquer sítio, chega lá.",
    body: "Distância, tempo a pé, próximo autocarro em tempo real, Bolt estimado — tudo num só toque no botão 'Bora lá!'.",
    icon: "compass",
    chips: [
      { label: "Vai e Vem", icon: "bus" },
      { label: "A pé", icon: "walk" },
      { label: "Bolt", icon: "car" },
    ],
  },
  {
    key: "hacks",
    bg: images.praia,
    kicker: "HACKS LOCAIS",
    title: "Poupança €80-120 já garantida.",
    body: "Self-catering, tour small-group de Benagil, autocarro Vai e Vem em vez de táxis. A viagem inteira sem stress ao melhor preço possível.",
    icon: "flash",
    chips: [
      { label: "Continente", icon: "cart" },
      { label: "Benagil", icon: "boat" },
      { label: "Upgrade quarto", icon: "gift" },
    ],
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    await storage.setItem("onboarding_done_v1", true);
    router.replace("/(tabs)" as any);
  };

  const next = () => {
    if (isLast) return finish();
    const n = index + 1;
    listRef.current?.scrollToIndex({ index: n, animated: true });
    setIndex(n);
  };

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && typeof viewableItems[0].index === "number") {
      setIndex(viewableItems[0].index);
    }
  }).current;

  // Floating bg animation
  const float = useSharedValue(0);
  useMemo(() => {
    float.value = withRepeat(withSequence(withTiming(-8, { duration: 2000 }), withTiming(0, { duration: 2000 })), -1, false);
  }, [float]);

  return (
    <View style={styles.screen}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        style={{ flex: 1 }}
        renderItem={({ item, index: i }) => (
          <OnbSlide slide={item} active={i === index} floatShared={float} />
        )}
      />
      {/* Skip */}
      <Pressable
        style={[styles.skip, { top: insets.top + 12 }]}
        onPress={finish}
        testID="onb-skip"
      >
        <Text style={styles.skipText}>Saltar</Text>
      </Pressable>
      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable style={styles.cta} onPress={next} testID="onb-next">
          <Text style={styles.ctaText}>{isLast ? "Começar viagem" : "Continuar"}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function OnbSlide({ slide, active, floatShared }: { slide: Slide; active: boolean; floatShared: any }) {
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatShared.value }] }));
  return (
    <View style={{ width, height }}>
      <Image source={{ uri: slide.bg }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.9)"]}
        style={StyleSheet.absoluteFill}
      />
      {active && (
        <View style={styles.slideInner}>
          <Animated.View entering={FadeInUp.duration(600)} style={[styles.iconBig, floatStyle]}>
            <Ionicons name={slide.icon} size={40} color="#fff" />
          </Animated.View>
          <Animated.Text entering={FadeIn.delay(150)} style={styles.slideKicker}>
            {slide.kicker}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.slideTitle}>
            {slide.title}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(320)} style={styles.slideBody}>
            {slide.body}
          </Animated.Text>
          {slide.chips && (
            <View style={styles.chipsRow}>
              {slide.chips.map((c, i) => (
                <Animated.View key={c.label} entering={FadeInDown.delay(420 + i * 90)}>
                  <View style={styles.chip}>
                    <Ionicons name={c.icon} size={14} color="#fff" />
                    <Text style={styles.chipText}>{c.label}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  slideInner: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.xl,
    paddingBottom: 180,
    gap: spacing.md,
  },
  iconBig: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.md,
  },
  slideKicker: { color: colors.brandTertiary, fontSize: 12, letterSpacing: 2, fontWeight: "800" },
  slideTitle: { color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -0.5, lineHeight: 40 },
  slideBody: { color: "rgba(255,255,255,0.9)", fontSize: 15, lineHeight: 22 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  chipText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  skip: {
    position: "absolute", right: spacing.xl,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  skipText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  bottom: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  dots: { flexDirection: "row", alignSelf: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { width: 24, backgroundColor: colors.brandTertiary },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
