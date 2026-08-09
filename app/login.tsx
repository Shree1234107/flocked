import { colors } from "../lib/colors";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "react-native-paper";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";
import { supabase } from "../lib/supabase";
import { getAuthRedirectUri } from "../lib/auth-helpers";
import { fonts } from "../lib/fonts";
import * as SecureStore from "../lib/secure-store";

// ─── Error helper (unchanged) ─────────────────────────────────────────────────

function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("email rate limit") || lower.includes("rate limit"))
    return "Too many sign-in attempts. Please wait a minute and try again.";
  if (lower.includes("email already") || lower.includes("already registered"))
    return "This email is already registered. Check your inbox for a sign-in link, or try a different email.";
  if (lower.includes("invalid email")) return "Please enter a valid email address.";
  if (lower.includes("network") || lower.includes("fetch"))
    return "Network error — please check your connection and try again.";
  return msg || "Failed to send sign-in link. Please try again.";
}

// ─── Left panel mini cards ────────────────────────────────────────────────────

const PREVIEW_CARDS = [
  { title: "Morning Vinyasa Yoga", time: "Today · 7:00 AM", spots: "4 spots left" },
  { title: "Strategic Chess Openings", time: "Tomorrow · 6:00 PM", spots: "3 spots left" },
  { title: "Jazz Piano Improv", time: "Saturday · 5:00 PM", spots: "6 spots left" },
];

const CARD_OFFSETS = [0, 20, 40];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);

  const handleSendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg(null);
    setSending(true);
    try {
      // "select" is a sentinel meaning "no role chosen yet" — the callback will
      // route new users to /select-role instead of defaulting them to guest or host.
      await SecureStore.setItemAsync("flocked.pending_role", "select").catch(() => {});
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: getAuthRedirectUri() },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => { setSent(false); setEmail(""); setErrorMsg(null); };

  if (!authLoading && !roleLoading && session && role) {
    return <Redirect href="/" />;
  }

  // ── Sent state ───────────────────────────────────────────────────────────────

  const sentPanel = (
    <View style={s.sentWrap}>
      <View style={s.sentIconCircle}>
        <MaterialCommunityIcons name="email-outline" size={28} color={colors.primary} />
      </View>
      <Text style={s.sentTitle}>Check your inbox</Text>
      <Text style={s.sentBody}>
        We sent a magic link to{" "}
        <Text style={s.sentEmailBold}>{email.trim()}</Text>
      </Text>
      <Text style={s.sentHint}>
        Didn't get it? Check spam or use a different email.
      </Text>
      <TouchableOpacity onPress={resetForm} activeOpacity={0.7} style={s.backLink}>
        <Text style={s.backLinkText}>← Use different email</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Form ─────────────────────────────────────────────────────────────────────

  const formPanel = (
    <View style={s.formWrap}>
      {/* Email input — native HTML on web for full style control */}
      {/* @ts-ignore */}
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e: any) => { setEmail(e.target.value); setErrorMsg(null); }}
        onKeyDown={(e: any) => { if (e.key === "Enter") handleSendMagicLink(); }}
        onFocus={() => setEmailFocused(true)}
        onBlur={() => setEmailFocused(false)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: errorMsg
            ? "1.5px solid #E5484D"
            : emailFocused
            ? `1.5px solid ${colors.primary}`
            : "1.5px solid #E8E8E8",
          borderRadius: 10,
          padding: "14px 16px",
          fontSize: 15,
          color: colors.navy,
          backgroundColor: "#FFFFFF",
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 0.15s",
        } as any}
      />

      <Text style={s.helperText}>We'll send you a magic link — no password needed</Text>

      {errorMsg && <Text style={s.errorText}>{errorMsg}</Text>}

      <TouchableOpacity
        style={[s.primaryBtn, sending && s.btnDisabled]}
        onPress={handleSendMagicLink}
        disabled={sending}
        activeOpacity={0.85}
      >
        <Text style={s.primaryBtnText}>
          {sending ? "Sending…" : "Continue with email →"}
        </Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={s.dividerRow}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>— or sign in as —</Text>
        <View style={s.dividerLine} />
      </View>

      {/* Role cards */}
      <TouchableOpacity
        style={s.roleCard as any}
        onPress={() => router.push("/login/guest")}
        activeOpacity={0.8}
      >
        <View style={s.roleIconCircle}>
          <MaterialCommunityIcons name="account-outline" size={20} color="#007A70" />
        </View>
        <View style={s.roleTextWrap}>
          <Text style={s.roleTitle}>Student</Text>
          <Text style={s.roleSub}>Browse and join live classes</Text>
        </View>
        <Text style={s.roleChevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.roleCard as any}
        onPress={() => router.push("/login/instructor")}
        activeOpacity={0.8}
      >
        <View style={s.roleIconCircle}>
          <MaterialCommunityIcons name="school-outline" size={20} color="#007A70" />
        </View>
        <View style={s.roleTextWrap}>
          <Text style={s.roleTitle}>Teacher</Text>
          <Text style={s.roleSub}>Teach and run live sessions</Text>
        </View>
        <Text style={s.roleChevron}>›</Text>
      </TouchableOpacity>

    </View>
  );

  // ── Web: split screen ────────────────────────────────────────────────────────

  if (Platform.OS === "web") {
    return (
      <View style={s.webRoot}>
        {/* Left panel */}
        {isDesktop && (
          <View
            style={[s.leftPanel, { background: `linear-gradient(160deg, ${colors.primary} 0%, #076D7D 100%)` } as any]}
          >
            {/* Logo */}
            <View style={s.leftLogo}>
              <Image
                source={require("../assets/logo.png")}
                style={s.logoImage}
              />
              <Text style={s.leftLogoText}>Flocked</Text>
            </View>

            {/* Center content */}
            <View style={s.leftCenter}>
              <Text style={s.leftHeadline}>
                {"Your next class\nis waiting for you."}
              </Text>
              <Text style={s.leftSub}>
                Real instructors. Small groups. Show up, learn something, come back next week.
              </Text>

              {/* Staggered preview cards */}
              <View style={s.previewCards}>
                {PREVIEW_CARDS.map((card, i) => (
                  <View
                    key={card.title}
                    style={[s.previewCard, { marginLeft: CARD_OFFSETS[i] }]}
                  >
                    <View style={s.previewCardText}>
                      <Text style={s.previewCardTitle} numberOfLines={1}>
                        {card.title}
                      </Text>
                      <Text style={s.previewCardMeta}>{card.time}</Text>
                    </View>
                    <View style={s.previewCardSpots}>
                      <Text style={s.previewCardSpotsText}>{card.spots}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Bottom hint */}
            <Text style={s.leftHint}>
              Don't have an account? Just enter your email — we'll create one.
            </Text>
          </View>
        )}

        {/* Right panel */}
        <View style={[s.rightPanel, !isDesktop && s.rightPanelFull]}>
          <ScrollView
            contentContainerStyle={s.rightScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back arrow */}
            <TouchableOpacity
              style={s.backArrow as any}
              onPress={() => router.replace("/" as never)}
              activeOpacity={0.7}
            >
              <Text style={s.backArrowText}>←</Text>
            </TouchableOpacity>

            {/* Form card */}
            <View style={s.rightCard}>
              {/* Logo badge */}
              <Image
                source={require("../assets/logo.png")}
                style={s.rightLogoImage}
              />

              <Text style={s.welcomeTitle}>Sign in to Flocked</Text>
              <Text style={s.welcomeSub}>Enter your email to get started</Text>

              {sent ? sentPanel : formPanel}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // ── Mobile ────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[s.mobileRoot, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.mobileScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.mobileLogo}>
          <Image
            source={require("../assets/logo.png")}
            style={s.logoImage}
          />
          <Text style={s.mobileLogoText}>Flocked</Text>
        </View>

        <Text style={s.welcomeTitle}>Sign in to Flocked</Text>
        <Text style={s.welcomeSub}>Enter your email to get started</Text>

        {sent ? (
          sentPanel
        ) : (
          <View style={s.mobileFormWrap}>
            <TextInput
              style={[
                s.mobileInput,
                errorMsg ? s.mobileInputError : emailFocused ? s.mobileInputFocused : null,
              ]}
              placeholder="Enter your email"
              placeholderTextColor="#B0B0B0"
              value={email}
              onChangeText={(v) => { setEmail(v); setErrorMsg(null); }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="go"
              onSubmitEditing={handleSendMagicLink}
            />

            <Text style={s.helperText}>We'll send you a magic link — no password needed</Text>
            {errorMsg && <Text style={s.errorText}>{errorMsg}</Text>}

            <TouchableOpacity
              style={[s.primaryBtn, sending && s.btnDisabled]}
              onPress={handleSendMagicLink}
              disabled={sending}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>
                {sending ? "Sending…" : "Continue with email →"}
              </Text>
            </TouchableOpacity>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>— or sign in as —</Text>
              <View style={s.dividerLine} />
            </View>

            <TouchableOpacity
              style={s.roleCard as any}
              onPress={() => router.push("/login/guest")}
              activeOpacity={0.8}
            >
              <View style={s.roleIconCircle}>
                <MaterialCommunityIcons name="account-outline" size={20} color="#007A70" />
              </View>
              <View style={s.roleTextWrap}>
                <Text style={s.roleTitle}>Student</Text>
                <Text style={s.roleSub}>Browse and join live classes</Text>
              </View>
              <Text style={s.roleChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.roleCard as any}
              onPress={() => router.push("/login/instructor")}
              activeOpacity={0.8}
            >
              <View style={s.roleIconCircle}>
                <MaterialCommunityIcons name="school-outline" size={20} color="#007A70" />
              </View>
              <View style={s.roleTextWrap}>
                <Text style={s.roleTitle}>Teacher</Text>
                <Text style={s.roleSub}>Teach and run live sessions</Text>
              </View>
              <Text style={s.roleChevron}>›</Text>
            </TouchableOpacity>

          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Shared logo image ────────────────────────────────────────────────────────
  logoImage: {
    width: 32,
    height: 32,
  },

  // ── Web root ─────────────────────────────────────────────────────────────────
  webRoot: { flex: 1, flexDirection: "row" },

  // ── Left panel ───────────────────────────────────────────────────────────────
  leftPanel: {
    width: "50%",
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  leftLogo: { flexDirection: "row", alignItems: "center", gap: 10 },
  leftLogoText: {
    fontSize: 17,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  leftCenter: { flex: 1, justifyContent: "center", paddingVertical: 40 },
  leftHeadline: {
    fontSize: 48,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 54,
    letterSpacing: -1,
  },
  leftSub: {
    fontSize: 18,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 28,
    marginTop: 16,
    maxWidth: 380,
  },
  previewCards: { marginTop: 40, gap: 10 },
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    maxWidth: 360,
  },
  previewCardText: { flex: 1 },
  previewCardTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.navy,
    lineHeight: 18,
  },
  previewCardMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#888888",
    marginTop: 1,
  },
  previewCardSpots: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewCardSpotsText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#007A70",
  },
  leftHint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 20,
  },

  // ── Right panel ──────────────────────────────────────────────────────────────
  rightPanel: { width: "50%", backgroundColor: colors.cream },
  rightPanelFull: { width: "100%" },
  rightScroll: {
    flexGrow: 1,
    minHeight: "100vh" as any,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  backArrow: {
    position: "absolute",
    top: 24,
    left: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  backArrowText: {
    fontSize: 18,
    color: "#007A70",
    fontFamily: fonts.bold,
    fontWeight: "700",
    lineHeight: 20,
  },
  rightCard: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: 0,
  },
  rightLogoImage: {
    width: 40,
    height: 40,
    marginBottom: 16,
  },

  // ── Mobile root ───────────────────────────────────────────────────────────────
  mobileRoot: { flex: 1, backgroundColor: colors.cream },
  mobileScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 8,
  },
  mobileLogo: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  mobileLogoText: {
    fontSize: 17,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.3,
  },
  mobileFormWrap: { gap: 12, width: "100%", marginTop: 24 },
  mobileInput: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.navy,
    backgroundColor: "#FFFFFF",
  },
  mobileInputFocused: { borderColor: colors.primary },
  mobileInputError: { borderColor: "#E5484D" },

  // ── Shared form elements ──────────────────────────────────────────────────────
  welcomeTitle: {
    fontSize: 28,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.navy,
    textAlign: "center",
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  welcomeSub: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#666666",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 0,
  },
  formWrap: { gap: 12, width: "100%", marginTop: 32 },
  helperText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
    marginTop: 2,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#E5484D",
    marginTop: -4,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#EBEBEB" },
  dividerText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#C0C0C0",
    textAlign: "center",
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    padding: 16,
    width: "100%",
    cursor: "pointer",
  },
  roleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  roleTextWrap: { flex: 1, gap: 2 },
  roleTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.navy,
  },
  roleSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#888888",
  },
  roleChevron: {
    fontSize: 20,
    color: "#C0C0C0",
    fontFamily: fonts.regular,
    lineHeight: 24,
  },

  // ── Sent state ────────────────────────────────────────────────────────────────
  sentWrap: {
    alignItems: "center",
    gap: 8,
    width: "100%",
    marginTop: 32,
    paddingHorizontal: 8,
  },
  sentIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  sentTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.navy,
    textAlign: "center",
  },
  sentBody: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginTop: 4,
  },
  sentEmailBold: {
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.navy,
  },
  sentHint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#B0B0B0",
    textAlign: "center",
    marginTop: 8,
  },
  backLink: { paddingVertical: 10, marginTop: 4 },
  backLinkText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.primary,
  },

});
