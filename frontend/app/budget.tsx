import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@/src/api";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

type Expense = { id: string; category: string; description: string; amount: number; created_at: string };

const CATEGORIES = ["Comida", "Transporte", "Atividades", "Extras"];

export default function Budget() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [min, setMin] = useState(250);
  const [max, setMax] = useState(290);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Comida");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const d = await api.listExpenses();
      setExpenses(d.expenses);
      setTotal(d.total_spent);
      setMin(d.budget_min);
      setMax(d.budget_max);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    const val = parseFloat(amount.replace(",", "."));
    if (!description.trim() || isNaN(val) || val <= 0) return;
    setAdding(true);
    try {
      await api.addExpense({ category, description: description.trim(), amount: val });
      setDescription(""); setAmount("");
      await load();
    } finally { setAdding(false); }
  };

  const del = async (id: string) => {
    await api.deleteExpense(id);
    load();
  };

  const pct = Math.min(100, (total / max) * 100);
  const overMin = total > min;
  const overMax = total > max;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Orçamento" subtitle={`Meta €${min}-${max} • hacks aplicados`} testID="budget-header" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Summary */}
          <View style={styles.summary} testID="budget-summary">
            <Text style={styles.summaryKicker}>GASTO ATÉ AGORA</Text>
            <Text style={styles.summaryValue}>€{total.toFixed(2)}</Text>
            <Text style={styles.summarySub}>de €{min}-{max} planeado</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: overMax ? colors.error : overMin ? colors.sun : colors.brandPrimary }]} />
            </View>
            <View style={styles.legendRow}>
              <Text style={styles.legend}>0€</Text>
              <Text style={styles.legend}>Meta €{max}</Text>
            </View>
          </View>

          {/* Add form */}
          <View style={styles.form} testID="budget-form">
            <Text style={styles.sectionTitle}>Adicionar gasto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              {CATEGORIES.map((c) => {
                const isActive = c === category;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.catChip, isActive && styles.catChipActive]}
                    testID={`cat-${c}`}
                  >
                    <Text style={[styles.catText, isActive && styles.catTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Almoço La Gioconda"
              placeholderTextColor={colors.onSurfaceMuted}
              style={styles.input}
              testID="budget-desc"
            />
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="€ 0,00"
              placeholderTextColor={colors.onSurfaceMuted}
              keyboardType="decimal-pad"
              style={styles.input}
              testID="budget-amount"
            />
            <Pressable
              onPress={add}
              disabled={adding || !description.trim() || !amount}
              style={[styles.addBtn, (adding || !description.trim() || !amount) && { opacity: 0.5 }]}
              testID="budget-add"
            >
              {adding ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addBtnText}>Adicionar gasto</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* List */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Registos ({expenses.length})</Text>
          {loading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xl }} />
          ) : expenses.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={32} color={colors.onSurfaceMuted} />
              <Text style={styles.emptyText}>Ainda sem gastos. Adiciona o primeiro acima.</Text>
            </View>
          ) : (
            expenses.map((e) => (
              <View key={e.id} style={styles.item} testID={`exp-${e.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemCategory}>{e.category.toUpperCase()}</Text>
                  <Text style={styles.itemDesc}>{e.description}</Text>
                </View>
                <Text style={styles.itemAmount}>€{e.amount.toFixed(2)}</Text>
                <Pressable onPress={() => del(e.id)} hitSlop={10} testID={`del-${e.id}`}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, paddingBottom: 80 },
  summary: {
    backgroundColor: colors.brandDark, borderRadius: radius.lg, padding: spacing.xl,
    ...shadows.medium,
  },
  summaryKicker: { fontSize: 11, letterSpacing: 1.5, fontWeight: "800", color: colors.brandTertiary },
  summaryValue: { fontSize: 40, fontWeight: "800", color: "#fff", letterSpacing: -1, marginTop: 4 },
  summarySub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  barTrack: { height: 10, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: radius.pill, marginTop: spacing.lg, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: radius.pill },
  legendRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  legend: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  form: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    marginTop: spacing.xl, gap: spacing.md, ...shadows.soft,
  },
  sectionTitle: { ...typography.h3, color: colors.onSurface },
  catRow: { gap: spacing.sm, paddingVertical: 4 },
  catChip: {
    height: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  catChipActive: { backgroundColor: colors.brandPrimary },
  catText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  catTextActive: { color: "#fff" },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 14, color: colors.onSurface,
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.brandSecondary, borderRadius: radius.md,
    paddingVertical: 14,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empty: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  emptyText: { fontSize: 13, color: colors.onSurfaceMuted, textAlign: "center" },
  item: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    marginTop: spacing.sm, ...shadows.soft,
  },
  itemCategory: { fontSize: 10, letterSpacing: 1, fontWeight: "800", color: colors.brandSecondary },
  itemDesc: { fontSize: 14, color: colors.onSurface, marginTop: 2 },
  itemAmount: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
});
