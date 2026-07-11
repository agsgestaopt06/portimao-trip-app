import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { colors, radius, shadows, spacing, typography } from "@/src/theme";

type Msg = { role: "user" | "assistant"; content: string };

const SESSION_ID = "sacramento-family-portimao-2026";

const SUGGESTIONS = [
  "Melhor sítio para gelado na Praia da Rocha?",
  "Como poupar com crianças pequenas?",
  "Melhor hora para as Grutas de Benagil?",
  "Prato português obrigatório em Portimão?",
  "O que fazer se chover?",
];

export default function Chat() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    api.chatHistory(SESSION_ID)
      .then((h: any[]) => {
        if (Array.isArray(h) && h.length) {
          setMessages(h.map((m) => ({ role: m.role, content: m.content })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await api.chat(SESSION_ID, msg);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Ups, tive um problema a responder. Tenta outra vez." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]} testID="chat-header">
        <View style={styles.avatarBig}>
          <Ionicons name="sparkles" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Guia Algarve</Text>
          <Text style={styles.sub}>Especialista local • família & hacks</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.lg }}
          testID="chat-messages"
        >
          {messages.length === 0 && (
            <View style={styles.welcome} testID="chat-welcome">
              <Text style={styles.welcomeTitle}>Olá, Família Sacramento 🌊</Text>
              <Text style={styles.welcomeBody}>
                Sou o Guia Algarve. Sei tudo sobre Portimão, Praia da Rocha, Benagil e como poupar em família. Pergunta o que quiseres!
              </Text>
            </View>
          )}

          {messages.map((m, i) => (
            <View
              key={i}
              style={[styles.bubbleRow, m.role === "user" ? styles.rowUser : styles.rowAI]}
              testID={`msg-${i}`}
            >
              <View style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAI]}>
                <Text style={m.role === "user" ? styles.textUser : styles.textAI}>{m.content}</Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubbleRow, styles.rowAI]}>
              <View style={[styles.bubble, styles.bubbleAI, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <ActivityIndicator size="small" color={colors.brandPrimary} />
                <Text style={styles.textAI}>A pensar…</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions */}
        {messages.length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sugRow}
            style={styles.sugScroll}
          >
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} style={styles.sugChip} onPress={() => send(s)} testID={`sug-${s.slice(0, 8)}`}>
                <Text style={styles.sugText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 90 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Pergunta ao guia…"
            placeholderTextColor={colors.onSurfaceMuted}
            style={styles.input}
            multiline
            testID="chat-input"
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
            testID="chat-send"
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatarBig: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center",
  },
  title: { ...typography.h2, color: colors.onSurface },
  sub: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  messages: { flex: 1 },
  welcome: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.lg, padding: spacing.xl,
    marginBottom: spacing.md,
  },
  welcomeTitle: { ...typography.h2, color: colors.brandDark },
  welcomeBody: { fontSize: 14, color: colors.onBrandTertiary, marginTop: 6, lineHeight: 20 },
  bubbleRow: { flexDirection: "row", marginBottom: spacing.md },
  rowUser: { justifyContent: "flex-end" },
  rowAI: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", padding: spacing.md, borderRadius: radius.lg },
  bubbleUser: { backgroundColor: colors.brandPrimary, borderBottomRightRadius: 6 },
  bubbleAI: { backgroundColor: colors.surfaceSecondary, borderBottomLeftRadius: 6, ...shadows.soft },
  textUser: { color: "#fff", fontSize: 14, lineHeight: 20 },
  textAI: { color: colors.onSurface, fontSize: 14, lineHeight: 20 },
  sugScroll: { flexGrow: 0 },
  sugRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.sm },
  sugChip: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.pill,
  },
  sugText: { color: colors.brandDark, fontSize: 12, fontWeight: "600" },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    maxHeight: 120, fontSize: 14, color: colors.onSurface,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: colors.borderStrong },
});
