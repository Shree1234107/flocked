import { useEffect, useState } from "react";
import {
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

import { AuthGate } from "../../components/AuthGate";
import { RoleGuard } from "../../components/RoleGuard";
import { getStudentProfile, updateStudentProfile, uploadAvatar } from "../../lib/api";
import { supabase } from "../../lib/supabase";

export default function StudentEditProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [profile, { data: { session } }] = await Promise.all([
          getStudentProfile(),
          supabase.auth.getSession(),
        ]);
        setUserId(session?.user?.id ?? null);
        setEmail(profile.email);
        setDisplayName(profile.display_name ?? "");
        setPhotoUrl(profile.photo_url ?? null);
      } catch {
        Alert.alert("Oops", "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to update your photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !userId) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(userId, result.assets[0].uri);
      setPhotoUrl(url);
    } catch (err) {
      Alert.alert("Oops", err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name) {
      Alert.alert("Required", "Please enter a display name.");
      return;
    }
    setSaving(true);
    try {
      await updateStudentProfile({ displayName: name, photoUrl });
      router.back();
    } catch (err) {
      Alert.alert("Oops", err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials = displayName.trim().slice(0, 2).toUpperCase() || "?";

  return (
    <AuthGate>
      <RoleGuard requiredRole="guest">
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              { paddingTop: 24, paddingBottom: insets.bottom + 40 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator color="#87A878" />
              </View>
            ) : (
              <>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                  <TouchableOpacity
                    style={styles.avatarWrap}
                    onPress={pickPhoto}
                    activeOpacity={0.8}
                    disabled={uploading}
                  >
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>{initials}</Text>
                      </View>
                    )}
                    <View style={styles.cameraOverlay}>
                      {uploading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.photoHint}>Tap to change photo</Text>
                </View>

                {/* Fields */}
                <View style={styles.fields}>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Display name</Text>
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      mode="outlined"
                      placeholder="Your name"
                      maxLength={50}
                      style={styles.input}
                      outlineColor="#EEEEEE"
                      activeOutlineColor="#87A878"
                      textColor="#2C2C2C"
                      theme={{ colors: { onSurfaceVariant: "#888888", background: "#FFFFFF" } }}
                    />
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                      value={email}
                      editable={false}
                      mode="outlined"
                      style={styles.inputReadOnly}
                      outlineColor="#EEEEEE"
                      activeOutlineColor="#EEEEEE"
                      textColor="#888888"
                      theme={{ colors: { onSurfaceVariant: "#BBBBBB", background: "#F9F9F9" } }}
                      right={<TextInput.Icon icon="lock-outline" color="#C0C0C0" />}
                    />
                    <Text style={styles.fieldHint}>Email cannot be changed</Text>
                  </View>
                </View>

                {/* Save */}
                <TouchableOpacity
                  style={[styles.saveBtn, (saving || uploading) && styles.btnDisabled]}
                  onPress={handleSave}
                  disabled={saving || uploading}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save changes</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </RoleGuard>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 24, gap: 28 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  avatarSection: { alignItems: "center", gap: 10 },
  avatarWrap: { position: "relative", width: 96, height: 96 },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F0F5EE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#87A878",
  },
  avatarInitials: { fontSize: 30, fontWeight: "700", color: "#87A878" },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#87A878",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  photoHint: { fontSize: 12, color: "#888888" },
  fields: { gap: 20 },
  fieldBlock: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#2C2C2C" },
  input: { backgroundColor: "#FFFFFF" },
  inputReadOnly: { backgroundColor: "#F9F9F9" },
  fieldHint: { fontSize: 11, color: "#BBBBBB" },
  saveBtn: {
    backgroundColor: "#87A878",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
