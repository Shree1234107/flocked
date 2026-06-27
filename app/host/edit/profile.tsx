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

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { getHostProfile, updateHostProfile, uploadAvatar } from "../../../lib/api";
import { INTEREST_TAGS } from "../../../lib/config";
import { supabase } from "../../../lib/supabase";

const TAG_COLORS: Record<string, { bg: string; selectedBg: string; text: string; border: string }> = {
  Yoga:     { bg: "#E0F7F5", selectedBg: "#00B4A6", text: "#007A70", border: "#C8DFC0" },
  Dance:    { bg: "#FDF0F2", selectedBg: "#E0F7F5", text: "#A04060", border: "#E0F7F5" },
  Tutoring: { bg: "#EEF3F8", selectedBg: "#94B4D2", text: "#3A5F80", border: "#94B4D2" },
};

export default function TeacherEditProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [profile, { data: { session } }] = await Promise.all([
          getHostProfile(),
          supabase.auth.getSession(),
        ]);
        setUserId(session?.user?.id ?? null);
        if (profile) {
          setDisplayName(profile.display_name ?? "");
          setBio(profile.bio ?? "");
          setPhotoUrl(profile.photo_url ?? null);
          setSelectedTags(profile.interest_tags ?? []);
        }
      } catch {
        Alert.alert("Oops", "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

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
      await updateHostProfile({
        displayName: name,
        bio: bio.trim(),
        interestTags: selectedTags as typeof INTEREST_TAGS[number][],
        photoUrl,
      });
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
      <RoleGuard requiredRole="host">
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
                <ActivityIndicator color="#00B4A6" />
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
                      activeOutlineColor="#00B4A6"
                      textColor="#2C2C2C"
                      theme={{ colors: { onSurfaceVariant: "#888888", background: "#FFFFFF" } }}
                    />
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Bio</Text>
                    <TextInput
                      value={bio}
                      onChangeText={setBio}
                      mode="outlined"
                      placeholder="Tell students about yourself and what you teach…"
                      multiline
                      numberOfLines={4}
                      maxLength={500}
                      style={styles.inputMultiline}
                      outlineColor="#EEEEEE"
                      activeOutlineColor="#00B4A6"
                      textColor="#2C2C2C"
                      theme={{ colors: { onSurfaceVariant: "#888888", background: "#FFFFFF" } }}
                    />
                    <Text style={styles.charCount}>{bio.length}/500</Text>
                  </View>

                  {/* Interest tags */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>What you teach</Text>
                    <Text style={styles.fieldHint}>Select all that apply</Text>
                    <View style={styles.tagsRow}>
                      {INTEREST_TAGS.map((tag) => {
                        const selected = selectedTags.includes(tag);
                        const colors = TAG_COLORS[tag];
                        return (
                          <TouchableOpacity
                            key={tag}
                            style={[
                              styles.tagChip,
                              {
                                backgroundColor: selected ? colors.selectedBg : colors.bg,
                                borderColor: selected ? colors.selectedBg : colors.border,
                              },
                            ]}
                            onPress={() => toggleTag(tag)}
                            activeOpacity={0.75}
                          >
                            {selected && (
                              <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />
                            )}
                            <Text
                              style={[
                                styles.tagChipText,
                                { color: selected ? "#FFFFFF" : colors.text },
                              ]}
                            >
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
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
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E0F7F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#00B4A6",
  },
  avatarInitials: { fontSize: 30, fontWeight: "700", color: "#00B4A6" },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#00B4A6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  photoHint: { fontSize: 12, color: "#888888" },
  fields: { gap: 20 },
  fieldBlock: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#2C2C2C" },
  fieldHint: { fontSize: 11, color: "#888888", marginTop: -2 },
  input: { backgroundColor: "#FFFFFF" },
  inputMultiline: { backgroundColor: "#FFFFFF", minHeight: 100 },
  charCount: { fontSize: 11, color: "#BBBBBB", textAlign: "right" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  tagChipText: { fontSize: 13, fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#00B4A6",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
