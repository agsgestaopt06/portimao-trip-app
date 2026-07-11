import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
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

import { api, Ticket } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

export default function Tickets() {
  const [items, setItems] = useState<Ticket[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrTicket, setQrTicket] = useState<Ticket | null>(null);

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
        subtitle="Rede Expressos + hotel + tour — tudo num só sítio"
        testID="tickets-header"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {items.map((t, i) => (
          <Animated.View key={t.id} entering={FadeInDown.delay(80 * i).duration(420)}>
            <Pressable
              style={styles.card}
              testID={`ticket-${t.id}`}
              onPress={() => t.qr_url && setQrTicket(t)}
            >
              <View style={[styles.stripe, { backgroundColor: t.color }]}>
                <Ionicons name={t.icon as any} size={22} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stripeLabel}>{typeLabel(t.type)}</Text>
                  {t.operator && <Text style={styles.stripeOperator}>{t.operator}</Text>}
                </View>
                {t.qr_url && (
                  <View style={styles.qrHint}>
                    <Ionicons name="qr-code" size={18} color="#fff" />
                  </View>
                )}
              </View>

              {/* Perforation strip */}
              <View style={styles.perforation}>
                <View style={styles.notchLeft} />
                {Array.from({ length: 20 }).map((_, k) => (
                  <View key={k} style={styles.dashPiece} />
                ))}
                <View style={styles.notchRight} />
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

                {t.duration && (
                  <View style={styles.durChip}>
                    <Ionicons name="time" size={12} color={colors.brandDark} />
                    <Text style={styles.durText}>{t.duration}</Text>
                  </View>
                )}

                {/* Passengers list (bus tickets) */}
                {t.passengers && t.passengers.length > 0 && (
                  <View style={styles.paxBlock}>
                    <Text style={styles.paxKicker}>PASSAGEIROS ({t.passengers.length})</Text>
                    {t.passengers.map((p, pi) => (
                      <View key={pi} style={styles.paxRow}>
                        <View style={styles.paxSeat}>
                          <Text style={styles.paxSeatText}>{p.seat}</Text>
                        </View>
                        <Text style={styles.paxName}>{p.name}</Text>
                        <Text style={styles.paxClass}>{p.class}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Amenities (hotel) */}
                {t.amenities && t.amenities.length > 0 && (
                  <View>
                    <Text style={styles.paxKicker}>AMENIDADES</Text>
                    <View style={styles.amenityGrid}>
                      {t.amenities.map((a, ai) => (
                        <View key={ai} style={styles.amenityChip}>
                          <Ionicons name={a.icon as any} size={13} color={colors.brandDark} />
                          <Text style={styles.amenityText}>{a.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Nearby POIs (hotel) */}
                {t.nearby && t.nearby.length > 0 && (
                  <View>
                    <Text style={styles.paxKicker}>PONTOS DE INTERESSE PRÓXIMOS</Text>
                    {t.nearby.map((n, ni) => (
                      <View key={ni} style={styles.nearbyRow}>
                        <Ionicons name="location-outline" size={13} color={colors.onSurfaceMuted} />
                        <Text style={styles.nearbyName}>{n.name}</Text>
                        <Text style={styles.nearbyDist}>{n.distance}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Extras / reminders */}
                {t.extras && t.extras.length > 0 && (
                  <View style={styles.extrasBox}>
                    {t.extras.map((e, ei) => (
                      <View key={ei} style={styles.extraRow}>
                        <Ionicons name="checkmark-circle" size={13} color={colors.brandSecondary} />
                        <Text style={styles.extraText}>{e}</Text>
                      </View>
                    ))}
                  </View>
                )}

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
                  {t.qr_url && (
                    <Pressable
                      style={styles.actionPrimary}
                      onPress={() => setQrTicket(t)}
                      testID={`ticket-qr-${t.id}`}
                    >
                      <Ionicons name="qr-code" size={16} color="#fff" />
                      <Text style={styles.actionPrimaryText}>Mostrar QR</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.actionBtn} onPress={() => shareWhatsApp(t)} testID={`ticket-share-${t.id}`}>
                    <Ionicons name="share-social" size={16} color={colors.brandPrimary} />
                    <Text style={styles.actionText}>Partilhar</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ))}

        <View style={styles.footNote}>
          <Ionicons name="cloud-offline" size={16} color={colors.onSurfaceMuted} />
          <Text style={styles.footText}>
            Bilhetes digitais Rede Expressos podem ser usados <Text style={{ fontWeight: "700" }}>offline</Text>. Basta mostrar no telemóvel.
          </Text>
        </View>
      </ScrollView>

      {/* QR modal */}
      <Modal
        visible={!!qrTicket}
        transparent
        animationType={Platform.OS === "web" ? "fade" : "slide"}
        onRequestClose={() => setQrTicket(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setQrTicket(null)}>
          <Animated.View entering={SlideInDown.duration(300)} style={styles.qrSheet}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.grabber} />
              {qrTicket && (
                <>
                  <View style={styles.qrHeader}>
                    <View style={[styles.qrIconWrap, { backgroundColor: qrTicket.color }]}>
                      <Ionicons name={qrTicket.icon as any} size={22} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.qrTitle}>{qrTicket.title}</Text>
                      <Text style={styles.qrSub}>{qrTicket.when}</Text>
                    </View>
                    <Pressable onPress={() => setQrTicket(null)} hitSlop={12}>
                      <Ionicons name="close" size={24} color={colors.onSurfaceMuted} />
                    </Pressable>
                  </View>
                  <Animated.View entering={FadeIn.delay(100)} style={styles.qrImageWrap}>
                    <Image source={{ uri: qrTicket.qr_url }} style={styles.qrImage} contentFit="contain" />
                  </Animated.View>
                  <Text style={styles.qrCode}>{qrTicket.code}</Text>
                  <Text style={styles.qrHintText}>Mostra este QR ao motorista ou na receção</Text>
                  {qrTicket.reservation && (
                    <Text style={styles.qrRes}>Reserva: {qrTicket.reservation}</Text>
                  )}
                </>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
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
  stripeOperator: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 },
  qrHint: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  perforation: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    height: 12,
    position: "relative",
  },
  notchLeft: {
    position: "absolute", left: -8, top: -6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.surface,
  },
  notchRight: {
    position: "absolute", right: -8, top: -6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.surface,
  },
  dashPiece: { flex: 1, height: 1, marginHorizontal: 3, backgroundColor: colors.border },
  body: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h2, color: colors.onSurface },
  row: { flexDirection: "row", gap: spacing.md },
  kicker: { fontSize: 10, letterSpacing: 1, fontWeight: "700", color: colors.brandSecondary },
  value: { fontSize: 13, fontWeight: "600", color: colors.onSurface, marginTop: 3, lineHeight: 18 },
  durChip: {
    alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  durText: { fontSize: 11, fontWeight: "700", color: colors.brandDark },
  code: {
    fontSize: 22, fontWeight: "800",
    color: colors.brandDark, letterSpacing: 2,
    marginTop: 4,
    fontFamily: "monospace",
  },
  copyHint: { fontSize: 10, color: colors.onSurfaceMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  priceText: { fontSize: 13, fontWeight: "700", color: colors.brandDark },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionPrimary: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.pill,
  },
  actionPrimaryText: { fontSize: 12, fontWeight: "700", color: "#fff" },
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

  // QR sheet
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  qrSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  grabber: {
    alignSelf: "center", width: 44, height: 5, borderRadius: 3,
    backgroundColor: colors.borderStrong, marginBottom: spacing.lg,
  },
  qrHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  qrIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  qrTitle: { ...typography.h3, color: colors.onSurface },
  qrSub: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  qrImageWrap: {
    alignSelf: "center",
    padding: spacing.md,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    ...shadows.medium,
  },
  qrImage: { width: 240, height: 240 },
  qrCode: {
    textAlign: "center",
    marginTop: spacing.lg,
    fontSize: 22, fontWeight: "800",
    letterSpacing: 3, color: colors.brandDark,
    fontFamily: "monospace",
  },
  qrHintText: { textAlign: "center", fontSize: 12, color: colors.onSurfaceMuted, marginTop: 6 },
  qrRes: { textAlign: "center", fontSize: 10, color: colors.onSurfaceMuted, marginTop: spacing.sm },

  // Passengers / amenities / nearby / extras
  paxBlock: { gap: 4 },
  paxKicker: { fontSize: 10, letterSpacing: 1, fontWeight: "700", color: colors.brandSecondary, marginBottom: 4 },
  paxRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm, paddingVertical: 8,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  paxSeat: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.brandDark,
    alignItems: "center", justifyContent: "center",
  },
  paxSeatText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  paxName: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.onSurface },
  paxClass: { fontSize: 10, fontWeight: "600", color: colors.onSurfaceMuted, textTransform: "uppercase" },
  amenityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  amenityChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.pill,
  },
  amenityText: { fontSize: 11, fontWeight: "600", color: colors.brandDark },
  nearbyRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 6, paddingHorizontal: 4,
  },
  nearbyName: { flex: 1, fontSize: 12, color: colors.onSurface, fontWeight: "500" },
  nearbyDist: { fontSize: 11, fontWeight: "700", color: colors.brandPrimary },
  extrasBox: { backgroundColor: colors.sunSoft, borderRadius: radius.md, padding: spacing.sm, gap: 4 },
  extraRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  extraText: { flex: 1, fontSize: 11, color: colors.onBrandTerracottaSoft, lineHeight: 15, fontWeight: "500" },
});
