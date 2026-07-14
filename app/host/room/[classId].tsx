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
  VideoPresets,
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
        await AudioSession.startAudioSession();
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
    return () => { AudioSession.stopAudioSession(); };
  }, [classId]);

  const handleEnd = useCallback(async () => {
    try { await endClass(classId); } catch { /* best-effort */ }
    router.replace("/host/(tabs)/index" as never);
  }, [classId, router]);

  const handleDisconnected = useCallback(() => {
    router.replace("/host/(tabs)/index" as never);
  }, [router]);

  // On web, flex:1 may not fill 100vh through LiveKitRoom's div wrapper.
  // Use an explicit height to guarantee no white space below the controls.
  const outerStyle = Platform.OS === "web"
    ? ({ height: "100vh", overflow: "hidden" } as any)
    : { flex: 1 };

  return (
    <AuthGate>
      <RoleGuard requiredRole="host">
        {loading ? (
          <ConnectingView />
        ) : error || !token ? (
          <ErrorView error={error} onBack={() => router.replace("/host/(tabs)/index" as never)} />
        ) : (
          <View style={outerStyle}>
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
                // Explicit simulcast layers ensure the server always has a 720p tier
                // for the large focus tile even when strip subscribers pull a lower layer.
                // Without this, LiveKit v2 defaults to a single-layer publish.
                publishDefaults: {
                  videoSimulcastLayers: [VideoPresets.h720, VideoPresets.h540, VideoPresets.h216],
                  videoCodec: "h264",
                  simulcast: true,
                },
              } as any}
              onError={(err: any) => console.error("[HostRoom] LiveKit error:", err?.message ?? err)}
              onDisconnected={handleDisconnected}
            >
              <RoomAudioRenderer />
              <RoomUI classTitle={classTitle} onEnd={handleEnd} />
            </LiveKitRoom>
          </View>
        )}
      </RoleGuard>
    </AuthGate>
  );
}

// ─── Inner room UI ─────────────────────────────────────────────────────────────
// Layout: top bar / large self-view focus tile / 140px student strip / controls

function RoomUI({
  classTitle,
  onEnd,
}: {
  classTitle: string;
  onEnd: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]);

  // Match by identity — avoids relying on isLocal which can be undefined on
  // track reference objects returned by useTracks in some LiveKit builds.
  const localId = localParticipant?.identity;
  const localCameraTrack = cameraTracks.find((t: any) => t.participant?.identity === localId);
  const remoteParticipants = participants.filter((p: any) => p.identity !== localId);
  const remoteCameraTracks = cameraTracks.filter((t: any) => t.participant?.identity !== localId);

  const toggleMic = useCallback(async () => {
    await localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [localParticipant, isMicrophoneEnabled]);

  const toggleCamera = useCallback(async () => {
    await localParticipant?.setCameraEnabled(!isCameraEnabled);
  }, [localParticipant, isCameraEnabled]);

  // On web, LiveKitRoom renders a plain <div> with no height or flex context,
  // so flex:1 on child Views has nothing to fill against → white space below bar.
  // Explicit pixel height bypasses that entirely; on native flex:1 works fine.
  const heightStyle = Platform.OS === "web" ? { height: windowHeight } as any : {};

  return (
    <View style={[styles.root, { paddingTop: insets.top }, heightStyle]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarInfo}>
          <Text style={styles.topTitle} numberOfLines={1}>{classTitle}</Text>
          <Text style={styles.topSub}>
            {remoteParticipants.length} student{remoteParticipants.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <Pressable style={styles.endBtnTop} onPress={onEnd}>
          <Text style={styles.endBtnTopText}>End Class</Text>
        </Pressable>
      </View>

      {/* Large self-view — instructor sees themselves in the focus tile */}
      <View style={styles.focusTile}>
        {isCameraEnabled && localCameraTrack ? (
          <VideoTrack
            trackRef={localCameraTrack as any}
            style={
              Platform.OS === "web"
                ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } as any
                : StyleSheet.absoluteFill
            }
          />
        ) : (
          <View style={styles.focusPlaceholder}>
            <MaterialCommunityIcons name="video-off-outline" size={48} color="#444444" />
            <Text style={styles.focusPlaceholderText}>Camera Off</Text>
          </View>
        )}
        <View style={styles.focusNameBar}>
          <Text style={styles.focusName} numberOfLines={1}>You (Instructor)</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* Student strip — fixed 140px, horizontally scrollable */}
      <View style={styles.strip}>
        {remoteParticipants.length === 0 ? (
          <View style={styles.stripEmpty}>
            <MaterialCommunityIcons name="account-clock-outline" size={22} color="#444444" />
            <Text style={styles.stripEmptyText}>Waiting for students…</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripContent}
          >
            {remoteParticipants.map((p: any) => {
              const trackRef = remoteCameraTracks.find(
                (t: any) => t.participant?.identity === p.identity
              ) ?? null;
              return (
                <SmallTile
                  key={p.identity}
                  trackRef={trackRef}
                  label={p.name ?? p.identity ?? "Student"}
                />
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Controls */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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

// ─── Small tile ───────────────────────────────────────────────────────────────

function SmallTile({ trackRef, label }: { trackRef: any; label: string }) {
  const initials = getInitials(label);
  return (
    <View style={styles.smallTile}>
      {trackRef ? (
        <VideoTrack
          trackRef={trackRef}
          style={
            Platform.OS === "web"
              ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } as any
              : StyleSheet.absoluteFill
          }
        />
      ) : (
        <View style={styles.smallTileAvatar}>
          <Text style={styles.smallTileInitials}>{initials}</Text>
        </View>
      )}
      <View style={styles.smallTileNameBar}>
        <Text style={styles.smallTileName} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────

function ControlButton({
  icon, label, onPress, active,
}: {
  icon: string; label: string; onPress: () => void; active: boolean;
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
      <MaterialCommunityIcons name={icon as never} size={22} color={active ? "#FFFFFF" : "#888888"} />
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
  root: { flex: 1, backgroundColor: "#0A0A0A", overflow: "hidden" },

  // Top bar
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#1A1A1A",
  },
  topBarInfo: { flex: 1, gap: 2, marginRight: 12 },
  topTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  topSub: { fontSize: 12, color: "#888888" },
  endBtnTop: {
    backgroundColor: "#EF4444", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  endBtnTopText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  // Focus tile — fills remaining space between top bar and strip
  focusTile: {
    flex: 1, minHeight: 0,
    backgroundColor: "#111111", overflow: "hidden", position: "relative",
  },
  focusPlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 12,
  },
  focusPlaceholderText: { fontSize: 14, color: "#555555" },
  focusNameBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  focusName: { fontSize: 14, fontWeight: "600", color: "#FFFFFF", flex: 1 },
  liveBadge: {
    backgroundColor: "#EF4444", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  liveBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },

  // Student strip
  strip: {
    height: 140, backgroundColor: "#0D0D0D",
    borderTopWidth: 1, borderTopColor: "#1A1A1A",
  },
  stripContent: {
    paddingHorizontal: 8, paddingVertical: 12, gap: 8, alignItems: "center",
  },
  stripEmpty: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  stripEmptyText: { fontSize: 13, color: "#555555" },

  // Small tile (112×112 square)
  smallTile: {
    width: 112, height: 112,
    borderRadius: 8, overflow: "hidden",
    backgroundColor: "#252525",
    borderWidth: 1.5, borderColor: "#333333",
    position: "relative",
  },
  smallTileAvatar: { flex: 1, alignItems: "center", justifyContent: "center" },
  smallTileInitials: { fontSize: 22, fontWeight: "700", color: colors.primary },
  smallTileNameBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 6, paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  smallTileName: { fontSize: 10, fontWeight: "600", color: "#FFFFFF", textAlign: "center" },

  // Controls
  bottomBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    backgroundColor: "#111111", paddingTop: 10, paddingHorizontal: 12, gap: 4,
    borderTopWidth: 1, borderTopColor: "#1A1A1A",
  },
  controlBtn: {
    alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, backgroundColor: "rgba(255,255,255,0.08)", minWidth: 64,
  },
  controlBtnOff: { backgroundColor: "rgba(0,0,0,0.25)" },
  controlBtnPressed: { opacity: 0.7 },
  controlLabel: { fontSize: 11, fontWeight: "500", color: "#FFFFFF" },
  controlLabelOff: { color: "#888888" },
  hangupBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#EF4444", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  hangupText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  participantBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8,
  },
  participantCount: { fontSize: 13, fontWeight: "600", color: "#CCCCCC" },

  // Loading / error
  fullCenter: {
    flex: 1, backgroundColor: "#0A0A0A",
    alignItems: "center", justifyContent: "center", gap: 16, padding: 32,
  },
  connectingText: { fontSize: 15, color: "#888888" },
  errorText: { fontSize: 14, color: "#888888", textAlign: "center" },
  backBtn: {
    backgroundColor: "#1A1A1A", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
