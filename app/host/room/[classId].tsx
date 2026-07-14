import { colors } from "../../../lib/colors";
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthGate } from "../../../components/AuthGate";
import { RoleGuard } from "../../../components/RoleGuard";
import { getLiveKitToken, endClass, listMyClasses } from "../../../lib/api";
import {
  LiveKitRoom,
  VideoTrack,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useTracks,
  Track,
  AudioSession,
} from "../../../lib/livekit";

const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL ?? "";

// ─── Outer screen ─────────────────────────────────────────────────────────────

export default function HostRoomScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState("Live Class");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setup = async () => {
      try {
        // Start native audio session (no-op on web)
        await AudioSession.startAudioSession();
        // Get LiveKit token + class title in parallel
        const [tok, classes] = await Promise.all([
          getLiveKitToken(classId),
          listMyClasses().catch(() => []),
        ]);
        const cls = classes.find((c) => c.id === classId);
        if (cls) setClassTitle(cls.title);
        setToken(tok);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect to room.");
      } finally {
        setLoading(false);
      }
    };
    setup();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, [classId]);

  const handleEnd = useCallback(async () => {
    try {
      await endClass(classId);
    } catch {
      // best-effort
    }
    router.replace("/host/(tabs)/index" as never);
  }, [classId, router]);

  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        {loading ? (
          <ConnectingView />
        ) : error || !token ? (
          <ErrorView error={error} onBack={() => router.replace("/host/(tabs)/index" as never)} />
        ) : (
          <View style={{ flex: 1 }}>
            <LiveKitRoom
              serverUrl={LIVEKIT_URL}
              token={token}
              connect={true}
              video={true}
              audio={true}
              options={{
                videoCaptureDefaults: {
                  resolution: { width: 1280, height: 720, frameRate: 30 },
                  facingMode: "user",
                },
              } as any}
              onError={(err: any) => console.error("[HostRoom] LiveKit error:", err?.message ?? err)}
              onDisconnected={handleEnd}
            >
              <RoomAudioRenderer />
              <RoomUI classTitle={classTitle} classId={classId} onEnd={handleEnd} />
            </LiveKitRoom>
          </View>
        )}
      </RoleGuard>
    </AuthGate>
  );
}

// ─── Inner room UI ────────────────────────────────────────────────────────────
// Must be a child of LiveKitRoom so hooks have context

function RoomUI({
  classTitle,
  classId,
  onEnd,
}: {
  classTitle: string;
  classId: string;
  onEnd: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const cameraTracks = useTracks([Track.Source.Camera]);

  const remoteParticipants = participants.filter((p) => !(p as any).isLocal);
  const remoteCameraTracks = cameraTracks.filter((t: any) => !t.participant?.isLocal);
  const localCameraTrack = cameraTracks.find((t: any) => t.participant?.isLocal);

  const toggleMic = useCallback(async () => {
    await localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [localParticipant, isMicrophoneEnabled]);

  const toggleCamera = useCallback(async () => {
    await localParticipant?.setCameraEnabled(!isCameraEnabled);
  }, [localParticipant, isCameraEnabled]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarInfo}>
          <Text style={styles.topTitle} numberOfLines={1}>{classTitle}</Text>
          <Text style={styles.topStudentCount}>
            {remoteParticipants.length} student{remoteParticipants.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <Pressable style={styles.endBtnTop} onPress={onEnd}>
          <Text style={styles.endBtnTopText}>End Class</Text>
        </Pressable>
      </View>

      {/* Student grid */}
      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={[
          styles.gridContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {remoteParticipants.length === 0 ? (
          <View style={styles.waitingState}>
            <MaterialCommunityIcons name="account-clock-outline" size={48} color="#444444" />
            <Text style={styles.waitingText}>Waiting for students to join…</Text>
          </View>
        ) : (
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            {remoteParticipants.map((participant: any) => {
              const trackRef = remoteCameraTracks.find(
                (t: any) => t.participant?.identity === participant.identity
              );
              return (
                <ParticipantTile
                  key={participant.identity}
                  participant={participant}
                  trackRef={trackRef}
                  isDesktop={isDesktop}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Self-preview — bottom right corner */}
      <View style={[styles.selfPreview, { bottom: insets.bottom + 72 }]}>
        <View style={styles.selfVideoWrap}>
          {isCameraEnabled && localCameraTrack ? (
            <VideoTrack
              trackRef={localCameraTrack as any}
              style={Platform.OS === "web"
                ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } as any
                : StyleSheet.absoluteFill
              }
            />
          ) : (
            <View style={styles.selfCamOff}>
              <MaterialCommunityIcons name="video-off-outline" size={18} color="#666666" />
            </View>
          )}
        </View>
        <Text style={styles.selfLabel}>You</Text>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <ControlButton
          icon={isMicrophoneEnabled ? "microphone" : "microphone-off"}
          label={isMicrophoneEnabled ? "Mute" : "Unmute"}
          onPress={toggleMic}
          active={isMicrophoneEnabled}
        />
        <ControlButton
          icon={isCameraEnabled ? "video-outline" : "video-off-outline"}
          label={isCameraEnabled ? "Camera" : "Cam Off"}
          onPress={toggleCamera}
          active={isCameraEnabled}
        />
        <Pressable style={styles.hangupBtn} onPress={onEnd}>
          <MaterialCommunityIcons name="phone-hangup" size={22} color="#FFFFFF" />
          <Text style={styles.hangupText}>End Class</Text>
        </Pressable>
        <View style={styles.participantBadge}>
          <MaterialCommunityIcons name="account-group-outline" size={14} color="#CCCCCC" />
          <Text style={styles.participantCount}>{remoteParticipants.length}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Participant tile ─────────────────────────────────────────────────────────

function ParticipantTile({
  participant,
  trackRef,
  isDesktop,
}: {
  participant: any;
  trackRef: any;
  isDesktop: boolean;
}) {
  const initials = getInitials(participant.name ?? participant.identity ?? "?");

  return (
    <View style={[styles.tile, isDesktop && styles.tileDesktop]}>
      <View style={styles.tileInner}>
        {trackRef ? (
          <VideoTrack
            trackRef={trackRef}
            style={Platform.OS === "web"
              ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } as any
              : StyleSheet.absoluteFill
            }
          />
        ) : (
          <View style={styles.tileAvatar}>
            <Text style={styles.tileInitials}>{initials}</Text>
          </View>
        )}
      </View>
      <View style={styles.tileNameBar}>
        <Text style={styles.tileName} numberOfLines={1}>
          {participant.name ?? participant.identity ?? "Student"}
        </Text>
      </View>
    </View>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────

function ControlButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.controlBtn,
        !active && styles.controlBtnOff,
        pressed && styles.controlBtnPressed,
      ]}
      onPress={onPress}
    >
      <MaterialCommunityIcons
        name={icon as never}
        size={22}
        color={active ? "#FFFFFF" : "#888888"}
      />
      <Text style={[styles.controlLabel, !active && styles.controlLabelOff]}>{label}</Text>
    </Pressable>
  );
}

// ─── Loading / error states ───────────────────────────────────────────────────

function ConnectingView() {
  return (
    <View style={styles.fullCenter}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.connectingText}>Connecting to room…</Text>
    </View>
  );
}

function ErrorView({ error, onBack }: { error: string | null; onBack: () => void }) {
  return (
    <View style={styles.fullCenter}>
      <MaterialCommunityIcons name="wifi-off" size={48} color="#444444" />
      <Text style={styles.errorText}>{error ?? "Could not connect to room."}</Text>
      <Pressable style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>Go Back</Text>
      </Pressable>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  topBarInfo: { flex: 1, gap: 2, marginRight: 12 },
  topTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  topStudentCount: { fontSize: 12, color: "#888888" },
  endBtnTop: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  endBtnTopText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  // Grid
  gridScroll: { flex: 1 },
  gridContent: { padding: 12, gap: 10 },
  grid: { gap: 10 },
  gridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  // Waiting state
  waitingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 16,
  },
  waitingText: { fontSize: 15, color: "#555555", textAlign: "center" },

  // Tile
  tile: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "#1A1A1A",
    aspectRatio: 16 / 9,
    width: "100%",
  },
  tileDesktop: {
    width: "48%",
  },
  tileInner: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    position: "relative",
  },
  tileAvatar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252525",
  },
  tileInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
  },
  tileNameBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  tileName: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },

  // Self preview
  selfPreview: {
    position: "absolute",
    right: 16,
    alignItems: "center",
    gap: 4,
  },
  selfVideoWrap: {
    width: 120,
    height: 160,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "#1A1A1A",
    position: "relative",
  },
  selfCamOff: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252525",
  },
  selfLabel: { fontSize: 11, color: "#AAAAAA", fontWeight: "500" },

  // Bottom bar
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.primary,
    paddingTop: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  controlBtn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    minWidth: 64,
  },
  controlBtnOff: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  controlBtnPressed: { opacity: 0.7 },
  controlLabel: { fontSize: 11, fontWeight: "500", color: "#FFFFFF" },
  controlLabelOff: { color: "#888888" },
  hangupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  hangupText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  participantBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  participantCount: { fontSize: 13, fontWeight: "600", color: "#CCCCCC" },

  // Loading / error
  fullCenter: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },
  connectingText: { fontSize: 15, color: "#888888" },
  errorText: { fontSize: 14, color: "#888888", textAlign: "center" },
  backBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
