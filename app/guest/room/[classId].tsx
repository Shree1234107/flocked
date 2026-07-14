import { colors } from "../../../lib/colors";
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
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
        console.log("[GuestRoom] classId:", classId);
        const [tok, cls] = await Promise.all([
          getLiveKitToken(classId),
          getClass(classId).catch((err) => {
            console.error("[GuestRoom] getClass failed:", err?.message ?? err);
            return null;
          }),
        ]);
        console.log("[GuestRoom] class found:", cls?.title ?? "NOT FOUND", "status:", cls?.status);
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
    return () => {
      AudioSession.stopAudioSession();
    };
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

  return (
    <AuthGate>
      {loading ? (
        <ConnectingView />
      ) : error || !token ? (
        <ErrorView error={error} onBack={() => router.replace("/guest/(tabs)/index" as never)} />
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

// ─── Inner room UI ────────────────────────────────────────────────────────────

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
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const cameraTracks = useTracks([Track.Source.Camera]);

  // LiveKit identity is "user-<uuid>" — match instructor by host_id
  const instructorIdentity = instructorId ? `user-${instructorId}` : null;

  const remoteParticipants = participants.filter((p) => !(p as any).isLocal);
  const localCameraTrack = cameraTracks.find((t: any) => t.participant?.isLocal);

  const instructorParticipant = remoteParticipants.find(
    (p: any) => p.identity === instructorIdentity
  ) ?? null;
  const instructorTrack = cameraTracks.find(
    (t: any) => t.participant?.identity === instructorIdentity
  ) ?? null;

  // Other remote participants (not the instructor)
  const otherParticipants = remoteParticipants.filter(
    (p: any) => p.identity !== instructorIdentity
  );
  const otherTracks = cameraTracks.filter(
    (t: any) => !t.participant?.isLocal && t.participant?.identity !== instructorIdentity
  );

  const totalInRoom = remoteParticipants.length + 1;

  useEffect(() => {
    console.log(
      "[GuestRoomUI] track state —",
      "participants:", participants.length,
      "| camTracks:", cameraTracks.length,
      "| isCamOn:", isCameraEnabled,
      "| isMicOn:", isMicrophoneEnabled,
      "| hasLocalCam:", !!localCameraTrack,
      "| hasInstructorTrack:", !!instructorTrack,
    );
  }, [participants.length, cameraTracks.length, isCameraEnabled, isMicrophoneEnabled]);

  const toggleMic = useCallback(async () => {
    try {
      await localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err: any) {
      console.error("[GuestRoomUI] setMicrophoneEnabled failed:", err?.message ?? err);
    }
  }, [localParticipant, isMicrophoneEnabled]);

  const toggleCamera = useCallback(async () => {
    try {
      await localParticipant?.setCameraEnabled(!isCameraEnabled);
    } catch (err: any) {
      console.error("[GuestRoomUI] setCameraEnabled failed:", err?.message ?? err);
    }
  }, [localParticipant, isCameraEnabled]);

  // Show strip when there are other students or self to display alongside instructor
  const stripItems = [
    ...otherParticipants.map((p: any) => ({
      key: p.identity,
      participant: p,
      trackRef: otherTracks.find((t: any) => t.participant?.identity === p.identity) ?? null,
      isSelf: false,
    })),
    ...(localCameraTrack
      ? [{ key: "local", participant: { name: "You", identity: "local" }, trackRef: localCameraTrack, isSelf: true }]
      : []),
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarInfo}>
          <Text style={styles.topTitle} numberOfLines={1}>{classTitle}</Text>
          <Text style={styles.topParticipantCount}>{totalInRoom} in room</Text>
        </View>
        <Pressable style={styles.leaveBtnTop} onPress={onLeave}>
          <Text style={styles.leaveBtnTopText}>Leave</Text>
        </Pressable>
      </View>

      {/* Main content: large instructor focus + participant strip */}
      <View style={styles.mainContent}>
        {/* Instructor focus tile */}
        <View style={styles.focusTile}>
          {instructorParticipant ? (
            instructorTrack ? (
              <VideoTrack
                trackRef={instructorTrack as any}
                style={Platform.OS === "web"
                  ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain" } as any
                  : StyleSheet.absoluteFill
                }
              />
            ) : (
              <View style={styles.focusAvatar}>
                <Text style={styles.focusInitials}>
                  {getInitials(instructorParticipant.name ?? "Instructor")}
                </Text>
              </View>
            )
          ) : (
            <View style={styles.focusWaiting}>
              <MaterialCommunityIcons name="account-clock-outline" size={48} color="#444444" />
              <Text style={styles.focusWaitingText}>Waiting for instructor…</Text>
            </View>
          )}
          {/* Name overlay */}
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

        {/* Participant strip */}
        {stripItems.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.strip}
            contentContainerStyle={styles.stripContent}
          >
            {stripItems.map(({ key, participant, trackRef, isSelf }) => (
              <SmallTile
                key={key}
                participant={participant as any}
                trackRef={trackRef as any}
                isSelf={isSelf}
              />
            ))}
          </ScrollView>
        )}
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

// ─── Small tile for strip ─────────────────────────────────────────────────────

function SmallTile({
  participant,
  trackRef,
  isSelf,
}: {
  participant: any;
  trackRef: any;
  isSelf: boolean;
}) {
  const initials = getInitials(participant.name ?? participant.identity ?? "?");
  return (
    <View style={styles.smallTile}>
      <View style={styles.smallTileInner}>
        {trackRef ? (
          <VideoTrack
            trackRef={trackRef}
            style={Platform.OS === "web"
              ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } as any
              : StyleSheet.absoluteFill
            }
          />
        ) : (
          <View style={styles.smallTileAvatar}>
            <Text style={styles.smallTileInitials}>{initials}</Text>
          </View>
        )}
      </View>
      <Text style={styles.smallTileName} numberOfLines={1}>
        {isSelf ? "You" : (participant.name ?? "Student")}
      </Text>
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
  root: { flex: 1, backgroundColor: "#0A0A0A" },

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
  topParticipantCount: { fontSize: 12, color: "#888888" },
  leaveBtnTop: {
    backgroundColor: "#333333",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  leaveBtnTopText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  // ── Focus layout ──────────────────────────────────────────────────────────────
  mainContent: { flex: 1, minHeight: 0 },

  focusTile: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    position: "relative",
    overflow: "hidden",
  },
  focusAvatar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252525",
  },
  focusInitials: { fontSize: 56, fontWeight: "700", color: colors.primary },
  focusWaiting: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#111111",
  },
  focusWaitingText: { fontSize: 15, color: "#555555", textAlign: "center" },
  focusNameBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  focusName: { fontSize: 14, fontWeight: "600", color: "#FFFFFF", flex: 1 },
  hostBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hostBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },

  // ── Participant strip ─────────────────────────────────────────────────────────
  strip: {
    height: 90,
    backgroundColor: "#0D0D0D",
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
  },
  stripContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
  },
  smallTile: {
    width: 64,
    alignItems: "center",
    gap: 4,
  },
  smallTileInner: {
    width: 64,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#252525",
    borderWidth: 1.5,
    borderColor: "#333333",
    position: "relative",
  },
  smallTileAvatar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  smallTileInitials: { fontSize: 16, fontWeight: "700", color: colors.primary },
  smallTileName: { fontSize: 10, color: "#AAAAAA", fontWeight: "500", textAlign: "center" },

  // ── Controls ──────────────────────────────────────────────────────────────────
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#111111",
    paddingTop: 10,
    paddingHorizontal: 12,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
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
    backgroundColor: "#EF4444",
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  leaveBtnText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  participantBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  participantCount: { fontSize: 13, fontWeight: "600", color: "#CCCCCC" },

  fullCenter: {
    flex: 1, backgroundColor: "#0A0A0A",
    alignItems: "center", justifyContent: "center",
    gap: 16, padding: 32,
  },
  connectingText: { fontSize: 15, color: "#888888" },
  errorText: { fontSize: 14, color: "#888888", textAlign: "center" },
  backBtn: {
    backgroundColor: "#1A1A1A", borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
