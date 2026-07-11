import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
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

import { api, Ticket } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

export default function Tickets() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    api.tickets().then((d: Ticket[]) => setItems(d)).catch(() => {});
  }, []);

  const copy = async (id: string, code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* no-op */ }
  };

  const shareWhatsApp = (t: Ticket) => {
    const text = `${t.title}\n${t.when}\n${t.arrival}\nCódigo: ${t.code}\n${t.price}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Bilhetes digitais"
        subtitle="Tudo num só sítio • pronto para partilhar"
        testID="tickets-header"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.map((t, i) => (
          <Animated.View key={t.id} entering={FadeInDown.delay(80 * i).duration(420)}>
            <View style={styles.card} testID={`ticket-${t.id}`}>
              <View style={[styles.stripe, { backgroundColor: t.color }]}>
                <Ionicons name={t.icon as any} size={22} color="#fff" />
                <Text style={styles.stripeLabel}>{typeLabel(t.type)}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>{t.title}</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kicker}>QUANDO</Text>
                    <Text style={styles.value}>{t.when}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kicker}>ONDE</Text>
                    <Text style={styles.value}>{t.arrival}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kicker}>CÓDIGO</Text>
                    <Pressable onPress={() => copy(t.id, t.code)} testID={`ticket-code-${t.id}`}>
                      <Text style={styles.code}>{t.code}</Text>
                      <Text style={styles.copyHint}>
                        {copiedId === t.id ? "✓ Copiado" : "toca para copiar"}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.kicker}>DETALHES</Text>
                    <Text style={[styles.value, { textAlign: "right" }]}>{t.seat}</Text>
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Ionicons name="pricetag" size={14} color={colors.brandSecondary} />
                  <Text style={styles.priceText}>{t.price}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable style={styles.actionBtn} onPress={() => shareWhatsApp(t)} testID={`ticket-share-${t.id}`}>
                    <Ionicons name="share-social" size={16} color={colors.brandPrimary} />
                    <Text style={styles.actionText}>Partilhar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Animated.View>
        ))}

        <View style={styles.footNote}>
          <Ionicons name="information-circle" size={16} color={colors.onSurfaceMuted} />
          <Text style={styles.footText}>
            Guarda os códigos no telemóvel — funcionam mesmo sem internet. Confirmação por email disponível em caso de perda.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function typeLabel(t: string): string {
  return t === "bus" ? "AUTOCARRO" : t === "hotel" ? "ALOJAMENTO" : t === "activity" ? "ATIVIDADE" : "BILHETE";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.medium,
  },
  stripe: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md,
  },
  stripeLabel: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  body: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h2, color: colors.onSurface },
  row: { flexDirection: "row", gap: spacing.md },
  kicker: { fontSize: 10, letterSpacing: 1, fontWeight: "700", color: colors.brandSecondary },
  value: { fontSize: 13, fontWeight: "600", color: colors.onSurface, marginTop: 3, lineHeight: 18 },
  code: {
    fontSize: 20, fontWeight: "800",
    color: colors.brandDark, letterSpacing: 1.5,
    marginTop: 4,
    fontFamily: "monospace",
  },
  copyHint: { fontSize: 10, color: colors.onSurfaceMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  priceText: { fontSize: 13, fontWeight: "700", color: colors.brandDark },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.pill,
  },
  actionText: { fontSize: 12, fontWeight: "700", color: colors.brandPrimary },
  footNote: {
    flexDirection: "row", gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  footText: { flex: 1, fontSize: 12, color: colors.onSurfaceTertiary, lineHeight: 17 },
});
