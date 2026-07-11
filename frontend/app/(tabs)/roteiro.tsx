import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

type Event = { time: string; title: string; description: string; icon: string; highlight: boolean };
type Day = { day: number; date: string; weekday: string; title: string; subtitle: string; events: Event[] };

export default function Roteiro() {
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState<Day[]>([]);
  const [active, setActive] = useState(1);

  useEffect(() => {
    api.itinerary().then(setDays).catch(() => setDays([]));
  }, []);

  const day = days.find((d) => d.day === active);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]} testID="roteiro-header">
        <Text style={styles.kicker}>ROTEIRO • 4 DIAS</Text>
        <Text style={styles.title}>A vossa viagem, dia a dia</Text>
        <Text style={styles.sub}>Planeado com ritmo tranquilo para o Arthur e o Alexsandro</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
        testID="roteiro-chips"
      >
        {days.map((d) => {
          const isActive = d.day === active;
          return (
            <Pressable
              key={d.day}
              onPress={() => setActive(d.day)}
              style={[styles.chip, isActive && styles.chipActive]}
              testID={`chip-day-${d.day}`}
            >
              <Text style={[styles.chipDay, isActive && styles.chipDayActive]}>Dia {d.day}</Text>
              <Text style={[styles.chipDate, isActive && styles.chipDateActive]}>{d.date}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {day && (
          <>
            <View style={styles.dayCard} testID={`day-card-${day.day}`}>
              <Text style={styles.dayWeekday}>{day.weekday.toUpperCase()} • {day.date}</Text>
              <Text style={styles.dayTitle}>{day.title}</Text>
              <Text style={styles.daySub}>{day.subtitle}</Text>
            </View>

            <View style={styles.timeline}>
              {day.events.map((e, i) => (
                <View key={i} style={styles.timelineRow} testID={`event-${day.day}-${i}`}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, e.highlight && styles.timelineDotHighlight]}>
                      <Ionicons name={e.icon as any} size={16} color={e.highlight ? "#fff" : colors.brandDark} />
                    </View>
                    {i < day.events.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={[styles.eventCard, e.highlight && styles.eventCardHighlight]}>
                    <Text style={[styles.eventTime, e.highlight && { color: colors.brandSecondary }]}>{e.time}</Text>
                    <Text style={styles.eventTitle}>{e.title}</Text>
                    <Text style={styles.eventDesc}>{e.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
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
  chipsScroll: { flexGrow: 0, marginTop: spacing.md },
  chipsRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md },
  chip: {
    height: 56, minWidth: 84, borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: spacing.md, flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  chipDay: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  chipDayActive: { color: "#fff" },
  chipDate: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 2 },
  chipDateActive: { color: "rgba(255,255,255,0.85)" },
  dayCard: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  dayWeekday: { fontSize: 11, letterSpacing: 1.2, fontWeight: "800", color: colors.brandDark },
  dayTitle: { fontSize: 24, fontWeight: "800", color: colors.brandDark, marginTop: 4, letterSpacing: -0.3 },
  daySub: { fontSize: 13, color: colors.onBrandTertiary, marginTop: 4 },
  timeline: {},
  timelineRow: { flexDirection: "row", gap: spacing.md },
  timelineLeft: { alignItems: "center", width: 36 },
  timelineDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  timelineDotHighlight: { backgroundColor: colors.brandSecondary },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4 },
  eventCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  eventCardHighlight: {
    borderWidth: 1.5, borderColor: colors.brandSecondary,
    backgroundColor: "#FFF8F4",
  },
  eventTime: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: colors.brandPrimary },
  eventTitle: { ...typography.h3, color: colors.onSurface, marginTop: 2 },
  eventDesc: { fontSize: 13, color: colors.onSurfaceMuted, marginTop: 4, lineHeight: 19 },
});
