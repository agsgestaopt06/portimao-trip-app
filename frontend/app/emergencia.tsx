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

import { api, EmergencyContact } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

export default function Emergencia() {
  const [items, setItems] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    api.emergency().then(setItems).catch(() => {});
  }, []);

  const call = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const openMap = (c: EmergencyContact) => {
    if (c.lat && c.lng) {
      Linking.openURL(`https://maps.google.com/?q=${c.lat},${c.lng}`).catch(() => {});
    }
  };

  const priority = items.filter((i) => i.tone === "danger");
  const health = items.filter((i) => i.id === "sns24" || i.id === "hospital" || i.id === "farmacia-rocha");
  const others = items.filter((i) => !priority.includes(i) && !health.includes(i));

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Emergências"
        subtitle="Contactos essenciais em Portimão"
        testID="emergency-header"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Big red 112 card */}
        {priority.map((c, i) => (
          <Animated.View key={c.id} entering={FadeInDown.delay(60 * i)}>
            <Pressable style={styles.big} onPress={() => call(c.phone)} testID={`em-${c.id}`}>
              <View style={styles.bigLeft}>
                <View style={styles.bigIcon}>
                  <Ionicons name={c.icon as any} size={30} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bigLabel}>{c.label}</Text>
                  <Text style={styles.bigSub}>{c.sub}</Text>
                  <Text style={styles.bigFree}>GRATUITO • 24H • UE</Text>
                </View>
              </View>
              <View style={styles.bigCall}>
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={styles.bigCallText}>{c.phone}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}

        {/* Section: Saúde */}
        <SectionTitle icon="medkit" title="Saúde" />
        {health.map((c, i) => (
          <Animated.View key={c.id} entering={FadeInDown.delay(60 * (i + 1))}>
            <ContactCard c={c} onCall={call} onMap={openMap} />
          </Animated.View>
        ))}

        {/* Section: Outros */}
        <SectionTitle icon="shield" title="Segurança & apoio" />
        {others.map((c, i) => (
          <Animated.View key={c.id} entering={FadeInDown.delay(60 * (i + 1))}>
            <ContactCard c={c} onCall={call} onMap={openMap} />
          </Animated.View>
        ))}

        <View style={styles.tipBox}>
          <Ionicons name="information-circle" size={18} color={colors.brandPrimary} />
          <Text style={styles.tipText}>
            <Text style={{ fontWeight: "800" }}>Dica: </Text>
            Guarda o 112 nos favoritos. Em Portugal (UE), 112 funciona sem SIM e é sempre gratuito.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={16} color={colors.brandSecondary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function ContactCard({
  c, onCall, onMap,
}: {
  c: EmergencyContact;
  onCall: (p: string) => void;
  onMap: (c: EmergencyContact) => void;
}) {
  return (
    <View style={styles.card} testID={`em-${c.id}`}>
      <View style={styles.cardMain}>
        <View style={styles.cardIcon}>
          <Ionicons name={c.icon as any} size={20} color={colors.brandDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>{c.label}</Text>
          <Text style={styles.cardSub}>{c.sub}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.callBtn} onPress={() => onCall(c.phone)} testID={`em-call-${c.id}`}>
          <Ionicons name="call" size={14} color="#fff" />
          <Text style={styles.callBtnText}>{c.phone}</Text>
        </Pressable>
        {c.lat && c.lng && (
          <Pressable style={styles.mapBtn} onPress={() => onMap(c)} testID={`em-map-${c.id}`}>
            <Ionicons name="navigate" size={14} color={colors.brandPrimary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: 80, gap: spacing.md },
  big: {
    backgroundColor: colors.error,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.medium,
  },
  bigLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bigIcon: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  bigLabel: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  bigSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  bigFree: { color: "#fff", fontSize: 10, marginTop: 6, letterSpacing: 1, fontWeight: "800", opacity: 0.9 },
  bigCall: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  bigCallText: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: 2 },
  sectionHead: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitle: { ...typography.h3, color: colors.onSurface },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  cardMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  cardLabel: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  cardSub: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: spacing.xs, alignItems: "center" },
  callBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
  },
  callBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  mapBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  tipBox: {
    flexDirection: "row", gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  tipText: { flex: 1, fontSize: 12, color: colors.brandDark, lineHeight: 17 },
});
