import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useRole } from "../lib/role";
import { supabase } from "../lib/supabase";

function MenuRow({
  icon,
  label,
  right,
  onPress,
  destructive = false,
}: {
  icon: string;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <MaterialCommunityIcons
        name={icon as never}
        size={18}
        color={destructive ? "#EF4444" : "#888888"}
      />
      <Text style={[styles.menuRowLabel, destructive && styles.menuRowDestructive]}>
        {label}
      </Text>
      {right ?? (
        onPress && !destructive ? (
          <MaterialCommunityIcons name="chevron-right" size={18} color="#D0D0D0" />
        ) : null
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clearRole } = useRole();

  const [classReminders, setClassReminders] = useState(true);
  const [newInstructorAlerts, setNewInstructorAlerts] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await clearRole();
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      {/* Notifications */}
      <Text style={styles.sectionHeader}>Notifications</Text>
      <View style={styles.card}>
        <MenuRow
          icon="bell-ring-outline"
          label="Class Reminders"
          right={
            <Switch
              value={classReminders}
              onValueChange={setClassReminders}
              trackColor={{ true: "#87A878", false: "#EEEEEE" }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <View style={styles.rowDivider} />
        <MenuRow
          icon="account-star-outline"
          label="New Instructor Alerts"
          right={
            <Switch
              value={newInstructorAlerts}
              onValueChange={setNewInstructorAlerts}
              trackColor={{ true: "#87A878", false: "#EEEEEE" }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <View style={styles.rowDivider} />
        <MenuRow
          icon="tag-outline"
          label="Promotions & News"
          right={
            <Switch
              value={promotions}
              onValueChange={setPromotions}
              trackColor={{ true: "#87A878", false: "#EEEEEE" }}
              thumbColor="#FFFFFF"
            />
          }
        />
      </View>

      {/* Appearance */}
      <Text style={styles.sectionHeader}>Appearance</Text>
      <View style={styles.card}>
        <MenuRow
          icon="weather-night"
          label="Dark Mode"
          right={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ true: "#87A878", false: "#EEEEEE" }}
              thumbColor="#FFFFFF"
            />
          }
        />
        {darkMode && (
          <>
            <View style={styles.rowDivider} />
            <View style={styles.darkModeNote}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#87A878" />
              <Text style={styles.darkModeNoteText}>
                Dark mode preference saved. Full theme support coming soon.
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Account */}
      <Text style={styles.sectionHeader}>Account</Text>
      <View style={styles.card}>
        <MenuRow icon="account-edit-outline" label="Edit Profile" onPress={() => {}} />
        <View style={styles.rowDivider} />
        <MenuRow icon="email-edit-outline" label="Change Email" onPress={() => {}} />
        <View style={styles.rowDivider} />
        <MenuRow icon="shield-lock-outline" label="Privacy Settings" onPress={() => {}} />
        <View style={styles.rowDivider} />
        <MenuRow
          icon="translate"
          label="Language & Region"
          onPress={() => router.push("/language")}
        />
      </View>

      {/* Referral */}
      <Text style={styles.sectionHeader}>Earn & Share</Text>
      <View style={styles.card}>
        <MenuRow
          icon="account-group-outline"
          label="Invite Friends"
          onPress={() => router.push("/referral")}
        />
        <View style={styles.rowDivider} />
        <MenuRow
          icon="email-newsletter"
          label="Welcome Email Preview"
          onPress={() => router.push("/welcome-email")}
        />
      </View>

      {/* About */}
      <Text style={styles.sectionHeader}>About</Text>
      <View style={styles.card}>
        <MenuRow icon="help-circle-outline" label="FAQ & Help" onPress={() => router.push("/faq")} />
        <View style={styles.rowDivider} />
        <MenuRow icon="information-outline" label="How It Works" onPress={() => router.push("/how-it-works")} />
        <View style={styles.rowDivider} />
        <MenuRow
          icon="chat-outline"
          label="Support Chat"
          onPress={() => router.push("/support-chat")}
        />
        <View style={styles.rowDivider} />
        <MenuRow icon="file-document-outline" label="Terms of Service" onPress={() => {}} />
      </View>

      {/* Sign out */}
      <View style={styles.signOutCard}>
        <MenuRow icon="logout" label="Sign Out" onPress={handleSignOut} destructive />
      </View>

      <Text style={styles.version}>Flocked v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  content: {
    paddingTop: 16,
    gap: 0,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    color: "#2C2C2C",
  },
  menuRowDestructive: {
    color: "#EF4444",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginLeft: 44,
  },
  darkModeNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F0F5EE",
  },
  darkModeNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#4A7A40",
    lineHeight: 18,
  },
  signOutCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    overflow: "hidden",
    marginTop: 20,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#C0C0C0",
    marginTop: 24,
  },
});
