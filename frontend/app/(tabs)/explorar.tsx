import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, shadows, spacing, typography } from "@/src/theme";

const HUB: {
  id: string;
  title: string;
  sub: string;
  icon: keyof typeof import("@expo/vector-icons/Ionicons").glyphMap;
  route: string;
  bg: string;
  fg: string;
}[] = [
  { id: "tickets", title: "Bilhetes digitais", sub: "Rede Expressos + hotel + QR", icon: "ticket", route: "/tickets", bg: "#0284C7", fg: "#fff" },
  { id: "beaches", title: "Praias", sub: "10 melhores • Bandeira Azul", icon: "sunny", route: "/beaches", bg: colors.sunSoft, fg: "#7C4A00" },
  { id: "activities", title: "Atividades & Atracções", sub: "Zoomarine, Benagil, Silves…", icon: "compass", route: "/activities", bg: colors.brandTertiary, fg: colors.brandDark },
  { id: "restaurants", title: "Restaurantes", sub: "18 opções • BR + PT + sushi + vegan", icon: "restaurant", route: "/restaurants", bg: colors.brandTerracottaSoft, fg: colors.onBrandTerracottaSoft },
  { id: "shopping", title: "Lista Continente", sub: "13 itens • ~€35 família", icon: "cart", route: "/shopping", bg: "#EFF6FF", fg: "#1E3A8A" },
  { id: "hacks", title: "Hacks & Segredos", sub: "8 dicas de agência local", icon: "flash", route: "/hacks", bg: "#1C1C1E", fg: "#fff" },
  { id: "kids", title: "Atividades crianças", sub: "6 ideias praia • Arthur & Alex", icon: "happy", route: "/kids-activities", bg: colors.sunSoft, fg: "#7C4A00" },
  { id: "budget", title: "Orçamento", sub: "Registar gastos • €250-290", icon: "wallet", route: "/budget", bg: colors.brandDark, fg: "#fff" },
  { id: "checklist", title: "Checklist", sub: "20 itens a levar", icon: "checkbox", route: "/checklist", bg: colors.surfaceSecondary, fg: colors.onSurface },
  { id: "map", title: "Mapa da viagem", sub: "8 locais + Smart Go", icon: "map", route: "/map", bg: colors.surfaceSecondary, fg: colors.onSurface },
  { id: "gallery", title: "Galeria", sub: "Fotos e vídeos • partilhar", icon: "images", route: "/gallery", bg: colors.surfaceSecondary, fg: colors.onSurface },
  { id: "diary", title: "Diário de viagem", sub: "Escrever memórias", icon: "book", route: "/diary", bg: colors.surfaceSecondary, fg: colors.onSurface },
  { id: "emergencia", title: "Emergências", sub: "112 • hospital • farmácia", icon: "medkit", route: "/emergencia", bg: "#FEE2E2", fg: "#B91C1C" },
];

export default function Explorar() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]} testID="explorar-header">
        <Text style={styles.kicker}>EXPLORAR</Text>
        <Text style={styles.title}>Tudo para a viagem</Text>
        <Text style={styles.sub}>Bilhetes, restaurantes, hacks locais, emergências e memórias.</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140, gap: spacing.md }} showsVerticalScrollIndicator={false}>
        {HUB.map((h, i) => (
          <Animated.View key={h.id} entering={FadeInDown.delay(40 * i)}>
            <Pressable
              style={[styles.card, { backgroundColor: h.bg }]}
              onPress={() => router.push(h.route as any)}
              testID={`hub-${h.id}`}
            >
              <View style={styles.cardLeft}>
                <View style={styles.cardIcon}>
                  <Ionicons name={h.icon} size={22} color={h.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: h.fg }]}>{h.title}</Text>
                  <Text style={[styles.cardSub, { color: h.fg, opacity: 0.75 }]}>{h.sub}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={h.fg} style={{ opacity: 0.6 }} />
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  kicker: { fontSize: 11, letterSpacing: 1.5, fontWeight: "800", color: colors.brandSecondary },
  title: { ...typography.displayMd, color: colors.onSurface, marginTop: spacing.xs },
  sub: { fontSize: 13, color: colors.onSurfaceMuted, marginTop: 4 },
  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderRadius: radius.lg, padding: spacing.lg, ...shadows.soft,
  },
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { ...typography.h3 },
  cardSub: { fontSize: 12, marginTop: 2 },
});
