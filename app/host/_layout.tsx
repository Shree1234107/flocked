import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAuth } from "../../lib/auth";
import { useRole } from "../../lib/role";
import { getInstructorApplication, submitInstructorApplication } from "../../lib/api";
import { supabase } from "../../lib/supabase";

type AppState = "loading" | "apply" | "pending" | "approved";

export default function HostLayout() {
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, clearRole } = useRole();
  const insets = useSafeAreaInsets();
  const [appState, setAppState] = useState<AppState>("loading");

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!session || role !== "host") return;

    getInstructorApplication()
      .then((result) => {
        if (result.is_approved) {
          setAppState("approved");
        } else if (result.submitted) {
          setAppState("pending");
        } else {
          setAppState("apply");
        }
      })
      .catch(() => setAppState("apply"));
  }, [session, role, authLoading, roleLoading]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      await clearRole();
    } catch {
      Alert.alert("Oops", "Sign out failed. Please try again.");
    }
  };

  if (appState === "loading") {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#87A878" />
      </View>
    );
  }

  if (appState === "apply") {
    return (
      <ApplicationQuestionnaire
        insets={insets}
        onSubmitted={() => setAppState("pending")}
        onSignOut={handleSignOut}
      />
    );
  }

  if (appState === "pending") {
    return (
      <PendingApproval
        email={session?.user?.email ?? ""}
        insets={insets}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: "#2C2C2C",
        headerTitleAlign: "center",
        headerTitleStyle: { fontWeight: "700" as const },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="edit/profile" options={{ headerShown: false }} />
      <Stack.Screen name="edit/fee" options={{ headerShown: false }} />
      <Stack.Screen name="schedule" options={{ title: "Schedule a Class" }} />
      <Stack.Screen name="earnings" options={{ title: "Earnings" }} />
    </Stack>
  );
}

// ─── Application questionnaire ────────────────────────────────────────────────

function ApplicationQuestionnaire({
  insets,
  onSubmitted,
  onSignOut,
}: {
  insets: ReturnType<typeof useSafeAreaInsets>;
  onSubmitted: () => void;
  onSignOut: () => void;
}) {
  const [whatToTeach, setWhatToTeach] = useState("");
  const [whyTeach, setWhyTeach] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!whatToTeach.trim() || !whyTeach.trim() || !qualifications.trim()) {
      Alert.alert("Oops", "Please answer all three questions before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await submitInstructorApplication({
        whatToTeach: whatToTeach.trim(),
        whyTeach: whyTeach.trim(),
        qualifications: qualifications.trim(),
      });
      onSubmitted();
    } catch (err) {
      Alert.alert("Oops", err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.formContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formIconWrap}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={32} color="#87A878" />
        </View>
        <Text style={styles.formTitle}>Instructor Application</Text>
        <Text style={styles.formSubtitle}>
          Tell us a bit about yourself. We review every application personally.
        </Text>

        <View style={styles.questionBlock}>
          <Text style={styles.questionLabel}>What do you want to teach?</Text>
          <TextInput
            value={whatToTeach}
            onChangeText={setWhatToTeach}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="e.g. Beginner yoga, beginner piano, GCSE math tutoring…"
            style={styles.textInput}
            outlineColor="#EEEEEE"
            activeOutlineColor="#87A878"
            textColor="#2C2C2C"
            theme={{ colors: { onSurfaceVariant: "#888888", background: "#F9F9F9" } }}
            maxLength={500}
          />
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.questionLabel}>Why do you want to teach this?</Text>
          <TextInput
            value={whyTeach}
            onChangeText={setWhyTeach}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Share your passion and motivation…"
            style={styles.textInput}
            outlineColor="#EEEEEE"
            activeOutlineColor="#87A878"
            textColor="#2C2C2C"
            theme={{ colors: { onSurfaceVariant: "#888888", background: "#F9F9F9" } }}
            maxLength={500}
          />
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.questionLabel}>What qualifies you to teach this?</Text>
          <TextInput
            value={qualifications}
            onChangeText={setQualifications}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Certifications, years of experience, training…"
            style={styles.textInput}
            outlineColor="#EEEEEE"
            activeOutlineColor="#87A878"
            textColor="#2C2C2C"
            theme={{ colors: { onSurfaceVariant: "#888888", background: "#F9F9F9" } }}
            maxLength={500}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Application</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutLink} onPress={onSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutLinkText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Pending approval screen ──────────────────────────────────────────────────

function PendingApproval({
  email,
  insets,
  onSignOut,
}: {
  email: string;
  insets: ReturnType<typeof useSafeAreaInsets>;
  onSignOut: () => void;
}) {
  return (
    <View style={[styles.pendingContainer, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.pendingIconWrap}>
        <MaterialCommunityIcons name="check-circle-outline" size={40} color="#87A878" />
      </View>
      <Text style={styles.pendingTitle}>Application Received!</Text>
      <Text style={styles.pendingBody}>
        A member of the Flocked team will reach out to you shortly to schedule an interview.
      </Text>
      {email ? (
        <View style={styles.pendingEmailBox}>
          <Text style={styles.pendingEmailLabel}>We'll contact you at</Text>
          <Text style={styles.pendingEmailValue}>{email}</Text>
        </View>
      ) : null}

      <View style={styles.pendingSteps}>
        <PendingStep number="1" text="Application reviewed by our team" />
        <PendingStep number="2" text="Interview scheduled via email" />
        <PendingStep number="3" text="Access to your teacher dashboard" />
      </View>

      <TouchableOpacity style={styles.signOutLink} onPress={onSignOut} activeOpacity={0.7}>
        <Text style={styles.signOutLinkText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

function PendingStep({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.pendingStep}>
      <View style={styles.pendingStepBadge}>
        <Text style={styles.pendingStepNumber}>{number}</Text>
      </View>
      <Text style={styles.pendingStepText}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  // Questionnaire
  formContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  formIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C2C2C",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  questionBlock: {
    gap: 6,
    marginBottom: 4,
  },
  questionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  textInput: {
    backgroundColor: "#F9F9F9",
  },
  submitBtn: {
    backgroundColor: "#87A878",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  signOutLink: {
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutLinkText: {
    fontSize: 14,
    color: "#888888",
    fontWeight: "500",
  },

  // Pending
  pendingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  pendingIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F0F5EE",
    borderWidth: 2,
    borderColor: "#87A878",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  pendingTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2C2C2C",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  pendingBody: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 22,
  },
  pendingEmailBox: {
    backgroundColor: "#F0F5EE",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 2,
    width: "100%",
    borderWidth: 1,
    borderColor: "#D4E8CC",
  },
  pendingEmailLabel: {
    fontSize: 11,
    color: "#4A7A40",
    fontWeight: "500",
  },
  pendingEmailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  pendingSteps: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  pendingStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  pendingStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#87A878",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pendingStepNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pendingStepText: {
    fontSize: 14,
    color: "#2C2C2C",
    flex: 1,
  },
});
