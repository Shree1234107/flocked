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
import { getLiveKitToken, getClass } from "../../../lib/api";
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

export default function GuestRoomScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState("Live Class");
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState("Instructor");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setup = async () => {
      try {
        await AudioSession.startAudioSession();
        const [tok, cls] = await Promise.all([
          getLiveKitToken(classId),
          getClass(classId).catch((err) => {
            console.error(
              "[GuestRoom] getClass failed —",
              "message:", err?.message ?? err,
              "| name:", err?.name,
              "| classId:", classId,
            );
            return null;
          }),
        ]);
        if (cls) {
          setClassTitle(cls.title);
          setInstructorId(cls.host_id);
          setInstructorName((cls.host as any)?.display_name ?? "Instructor");
        }
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

  const handleLeave = useCallback(() => {
    if (instructorId) {
      router.replace(
        `/guest/rating-prompt?classId=${encodeURIComponent(classId)}&instructorId=${encodeURIComponent(instructorId)}&title=${encodeURIComponent(classTitle)}&instructorName=${encodeURIComponent(instructorName)}` as never
      );
    } else {
      router.replace("/guest/(tabs)/index" as never);
    }
  }, [router, classId, classTitle, instructorId, instructorName]);

  // On web, flex:1 may not fill 100vh through LiveKitRoom's div wrapper.
  const outerStyle = Platform.OS === "web"
    ? ({ height: "100vh", overflow: "hidden" } as any)
    : { flex: 1 };

  return (
    <AuthGate>
      {loading ? (
        <ConnectingView />
      ) : error || !token ? (
        <ErrorView error={error} onBack={() => router.replace("/guest/(tabs)/index" as never)} />
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
            } as any}
            onError={(err: any) => console.error("[GuestRoom] LiveKit error:", err?.message ?? err)}
            onDisconnected={handleLeave}
          >
            <RoomAudioRenderer />
            <RoomUI
              classTitle={classTitle}
              instructorId={instructorId}
              onLeave={handleLeave}
            />
          </LiveKitRoom>
        </View>
      )}
    </AuthGate>
  );
}

// ─── Inner room UI ─────────────────────────────────────────────────────────────
// Layout: top bar / large instructor focus tile / 140px participant strip / controls
// Instructor identified by metadata.role === "host" stamped at token issuance.

function RoomUI({
  classTitle,
  instructorId,
  onLeave,
}: {
  classTitle: string;
  instructorId: string | null;
  onLeave: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const cameraTracks = useTracks([Track.Source.Camera]);

  // Match by identity — avoids isLocal property unreliability on track references.
  const localId = localParticipant?.identity;
  const remoteParticipants = participants.filter((p: any) => p.identity !== localId);
  const localCameraTrack = cameraTracks.find((t: any) => t.participant?.identity === localId);

  // Primary: metadata.role === "host" stamped at token issuance.
  const instructorByMetadata = remoteParticipants.find((p: any) => {
    try { return JSON.parse(p.metadata ?? "{}").role === "host"; } catch { return false; }
  }) ?? null;

  // Secondary: identity match using host_id from getClass() (works when metadata is absent/delayed).
  const instructorByIdentity = instructorId
    ? remoteParticipants.find((p: any) => p.identity === `user-${instructorId}`) ?? null
    : null;

  const instructorParticipant = instructorByMetadata ?? instructorByIdentity ?? null;

  const instructorTrack = instructorParticipant
    ? (cameraTracks.find((t: any) => t.participant?.identity === instructorParticipant.identity) ?? null)
    : null;

  // Other remote participants (not instructor). When instructorParticipant is null
  // nothing is excluded — all remotes appear in the strip alongside self.
  const otherParticipants = remoteParticipants.filter(
    (p: any) => !instructorParticipant || p.identity !== instructorParticipant.identity
  );
  const otherTracks = cameraTracks.filter(
    (t: any) => t.participant?.identity !== localId &&
      (!instructorParticipant || t.participant?.identity !== instructorParticipant.identity)
  );

  // Strip always includes self so the student can always see their own tile.
  const stripItems = [
    ...otherParticipants.map((p: any) => ({
      key: p.identity as string,
      trackRef: otherTracks.find((t: any) => t.participant?.identity === p.identity) ?? null,
      label: (p.name ?? p.identity ?? "Student") as string,
    })),
    {
      key: "local",
      trackRef: localCameraTrack ?? null,
      label: "You",
    },
  ];

  const totalInRoom = remoteParticipants.length + 1;

  useEffect(() => {
    console.log("[GuestRoomUI] remote participants:", remoteParticipants.map((p: any) => ({
      identity: p.identity, metadata: p.metadata,
      parsedRole: (() => { try { return JSON.parse(p.metadata ?? "{}").role; } catch { return "parse-error"; } })(),
    })));
    console.log("[GuestRoomUI] cam track identities:", cameraTracks.map((t: any) => t.participant?.identity));
    console.log("[GuestRoomUI] instructorByMetadata:", instructorByMetadata ? `FOUND (${instructorByMetadata.identity})` : "NOT FOUND");
    console.log("[GuestRoomUI] instructorByIdentity:", instructorByIdentity ? `FOUND (${instructorByIdentity.identity})` : `NOT FOUND (instructorId=${instructorId})`);
    console.log("[GuestRoomUI] instructorParticipant:", instructorParticipant ? `FOUND (${instructorParticipant.identity})` : "NOT FOUND");
    console.log("[GuestRoomUI] instructorTrack:", instructorTrack ? "FOUND" : "NOT FOUND");
  }, [participants.length, cameraTracks.length, instructorParticipant?.identity, !!instructorTrack]);

  const toggleMic = useCallback(async () => {
    try { await localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled); } catch { /* ignore */ }
  }, [localParticipant, isMicrophoneEnabled]);

  const toggleCamera = useCallback(async () => {
    try { await localParticipant?.setCameraEnabled(!isCameraEnabled); } catch { /* ignore */ }
  }, [localParticipant, isCameraEnabled]);

  // Same explicit height fix as host room — LiveKitRoom div has no height context on web.
  const heightStyle = Platform.OS === "web" ? { height: windowHeight } as any : {};

  return (
    <View style={[styles.root, { paddingTop: insets.top }, heightStyle]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarInfo}>
          <Text style={styles.topTitle} numberOfLines={1}>{classTitle}</Text>
          <Text style={styles.topSub}>{totalInRoom} in room</Text>
        </View>
        <Pressable style={styles.leaveBtnTop} onPress={onLeave}>
          <Text style={styles.leaveBtnTopText}>Leave</Text>
        </Pressable>
      </View>

      {/* Instructor focus tile — fills remaining space */}
      <View style={styles.focusTile}>
        {instructorParticipant ? (
          instructorTrack ? (
            <VideoTrack
              trackRef={instructorTrack as any}
              style={
                Platform.OS === "web"
                  ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } as any
                  : StyleSheet.absoluteFill
              }
            />
          ) : (
            <View style={styles.focusAvatar}>
              <Text style={styles.focusInitials}>
                {getInitials(instructorParticipant.name ?? "Instructor")}
              </Text>
              <Text style={styles.focusAvatarSub}>Camera off</Text>
            </View>
          )
        ) : (
          <View style={styles.focusWaiting}>
            <MaterialCommunityIcons name="account-clock-outline" size={52} color="#444444" />
            <Text style={styles.focusWaitingText}>Waiting for instructor…</Text>
          </View>
        )}
        {instructorParticipant && (
          <View style={styles.focusNameBar}>
            <Text style={styles.focusName} numberOfLines={1}>
              {instructorParticipant.name ?? "Instructor"}
            </Text>
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>Host</Text>
            </View>
          </View>
        )}
      </View>

      {/* Participant strip — fixed 140px, horizontally scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {stripItems.map(({ key, trackRef, label }) => (
          <SmallTile key={key} trackRef={trackRef} label={label} />
        ))}
      </ScrollView>

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
        <Pressable style={styles.leaveBtn} onPress={onLeave}>
          <MaterialCommunityIcons name="phone-hangup" size={22} color="#FFFFFF" />
          <Text style={styles.leaveBtnText}>Leave Class</Text>
        </Pressable>
        <View style={styles.participantBadge}>
          <MaterialCommunityIcons name="account-group-outline" size={14} color="#CCCCCC" />
          <Text style={styles.participantCount}>{totalInRoom}</Text>
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
  leaveBtnTop: {
    backgroundColor: "#333333", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  leaveBtnTopText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  // Focus tile — fills remaining space between top bar and strip
  focusTile: {
    flex: 1, minHeight: 0,
    backgroundColor: "#111111", overflow: "hidden", position: "relative",
  },
  focusAvatar: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#1A1A1A",
  },
  focusInitials: { fontSize: 64, fontWeight: "700", color: colors.primary },
  focusAvatarSub: { fontSize: 13, color: "#555555" },
  focusWaiting: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: "#111111",
  },
  focusWaitingText: { fontSize: 15, color: "#555555", textAlign: "center" },
  focusNameBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  focusName: { fontSize: 14, fontWeight: "600", color: "#FFFFFF", flex: 1 },
  hostBadge: {
    backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  hostBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },

  // Participant strip — fixed 140px height
  strip: {
    height: 140, backgroundColor: "#0D0D0D",
    borderTopWidth: 1, borderTopColor: "#1A1A1A",
  },
  stripContent: {
    paddingHorizontal: 8, paddingVertical: 12, gap: 8, alignItems: "center",
  },

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
  leaveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#EF4444", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  leaveBtnText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
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
