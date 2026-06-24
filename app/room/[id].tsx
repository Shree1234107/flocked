import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  ConnectionState,
  Track,
} from "../../lib/livekit";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthGate } from "../../components/AuthGate";
import { endRoom, getRoom, getLiveKitToken, joinRoom, leaveRoom } from "../../lib/api";
import { useRole } from "../../lib/role";
import { Room } from "../../lib/types";

class RoomErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: (error: Error) => React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

function EnableMediaAfterConnect() {
  const room = useRoomContext();
  const enabled = useRef(false);

  useEffect(() => {
    if (!room) return;
    const enable = async () => {
      if (enabled.current) return;
      enabled.current = true;
      try {
        await AudioSession.startAudioSession();
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
      } catch (e) {
        console.warn("[Room] Enable media failed:", e);
      }
    };
    if (room.state === ConnectionState.Connected) {
      enable();
    } else {
      room.on("connected", enable);
    }
    return () => {
      room.off("connected", enable);
      AudioSession.stopAudioSession();
    };
  }, [room]);

  return null;
}

function VideoGrid() {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const activeTracks = tracks.filter((t) => t?.publication?.trackSid);
  const count = activeTracks.length;

  const getVideoStyle = (index: number) => {
    if (count === 1) return styles.videoFullscreen;
    if (count === 2) return styles.videoHalf;
    return styles.videoGrid2col;
  };

  return (
    <View style={[styles.videoContainer, count === 2 && styles.videoContainerSplit]}>
      {activeTracks.map((track, i) => (
        <VideoTrack
          key={track.publication.trackSid}
          trackRef={track}
          style={getVideoStyle(i)}
        />
      ))}
    </View>
  );
}

function RoomControls({
  participantCount,
  roomTitle,
  onLeave,
  onBack,
}: {
  participantCount: number;
  roomTitle: string;
  onLeave: () => void;
  onBack: () => void;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const toggleMute = async () => {
    try {
      const next = !muted;
      await room?.localParticipant?.setMicrophoneEnabled(!next);
      setMuted(next);
    } catch (e) {
      console.warn("[Room] toggleMute failed:", e);
    }
  };

  const toggleCamera = async () => {
    try {
      const next = !cameraOff;
      await room?.localParticipant?.setCameraEnabled(!next);
      setCameraOff(next);
    } catch (e) {
      console.warn("[Room] toggleCamera failed:", e);
    }
  };

  return (
    <>
      {/* Top overlay bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.roomTitle} numberOfLines={1}>
          {roomTitle}
        </Text>

        <View style={styles.viewerBadge}>
          <MaterialCommunityIcons name="eye-outline" size={14} color="#FFFFFF" />
          <Text style={styles.viewerCount}>{participantCount}</Text>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.controlBtn, muted && styles.controlBtnActive]}
          onPress={toggleMute}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={muted ? "microphone-off" : "microphone"}
            size={22}
            color="#FFFFFF"
          />
          <Text style={styles.controlBtnLabel}>{muted ? "Unmute" : "Mute"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, cameraOff && styles.controlBtnActive]}
          onPress={toggleCamera}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={cameraOff ? "camera-off" : "camera"}
            size={22}
            color="#FFFFFF"
          />
          <Text style={styles.controlBtnLabel}>{cameraOff ? "Show" : "Camera"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.leaveBtn} onPress={onLeave} activeOpacity={0.85}>
          <Text style={styles.leaveBtnText}>Leave</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

export default function RoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useRole();
  const insets = useSafeAreaInsets();

  const [room, setRoom] = useState<Room | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);

  const joined = useRef(false);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const livekitUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL;

  useEffect(() => {
    if (!id) return;

    const init = async () => {
      try {
        const roomData = await getRoom(id);

        if (roomData.status === "ended") {
          setRoom(roomData);
          setLoading(false);
          return;
        }

        setRoom(roomData);
        setParticipantCount(roomData.participant_count);

        if (!joined.current) {
          joined.current = true;
          await joinRoom(id);
        }

        const lkToken = await getLiveKitToken(id);
        setToken(lkToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load room.");
      } finally {
        setLoading(false);
      }
    };

    init();

    pollInterval.current = setInterval(async () => {
      try {
        const latest = await getRoom(id);
        setParticipantCount(latest.participant_count);
        if (latest.status === "ended" && room?.status !== "ended") {
          setRoom(latest);
        }
      } catch {
        // Ignore poll errors
      }
    }, 10000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [id]);

  const navigateHome = () => {
    if (role === "host") {
      router.replace("/host");
    } else {
      router.replace("/guest");
    }
  };

  const handleLeave = async () => {
    if (pollInterval.current) clearInterval(pollInterval.current);

    try {
      await leaveRoom(id!);
    } catch {
      // Best-effort
    }

    if (role === "host") {
      Alert.alert(
        "End Room",
        "End the room for everyone?",
        [
          {
            text: "Just Leave",
            style: "cancel",
            onPress: navigateHome,
          },
          {
            text: "End Room",
            style: "destructive",
            onPress: async () => {
              try {
                await endRoom(id!);
              } catch {
                // Best-effort
              }
              navigateHome();
            },
          },
        ]
      );
    } else {
      navigateHome();
    }
  };

  const handleBack = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    leaveRoom(id!).catch(() => {});
    navigateHome();
  };

  if (loading) {
    return (
      <AuthGate>
        <View style={styles.centered}>
          <ActivityIndicator color="#89CFF0" />
          <Text style={styles.connectingText}>Joining room…</Text>
        </View>
      </AuthGate>
    );
  }

  if (error) {
    return (
      <AuthGate>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.backBtnFull} onPress={navigateHome} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </AuthGate>
    );
  }

  if (room?.status === "ended") {
    return (
      <AuthGate>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.endedEmoji}>🐦</Text>
          <Text style={styles.endedTitle}>This room has ended</Text>
          <Text style={styles.endedSubtext}>The teacher has ended this session.</Text>
          <TouchableOpacity style={styles.backBtnFull} onPress={navigateHome} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </AuthGate>
    );
  }

  if (!livekitUrl) {
    return (
      <AuthGate>
        <View style={styles.centered}>
          <Text style={styles.errorText}>LiveKit URL not configured.</Text>
        </View>
      </AuthGate>
    );
  }

  if (!token) {
    return (
      <AuthGate>
        <View style={styles.centered}>
          <ActivityIndicator color="#89CFF0" />
          <Text style={styles.connectingText}>Connecting…</Text>
        </View>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <View style={styles.container}>
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={token}
          connect
          video={false}
          audio={false}
          onConnected={() => console.log("[Room] LiveKit connected")}
          onDisconnected={handleLeave}
          onError={(err) => {
            console.error("[Room] LiveKit error:", err.message);
            setError(err.message);
          }}
        >
          <RoomErrorBoundary
            fallback={(err) => (
              <View style={styles.centered}>
                <Text style={styles.errorText}>Room error: {err.message}</Text>
              </View>
            )}
          >
            <EnableMediaAfterConnect />

            <View style={styles.roomWrapper}>
              <VideoGrid />

              <RoomControls
                participantCount={participantCount}
                roomTitle={room?.title ?? ""}
                onLeave={handleLeave}
                onBack={handleBack}
              />
            </View>
          </RoomErrorBoundary>
        </LiveKitRoom>
      </View>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  roomWrapper: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    gap: 16,
    padding: 24,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  videoContainerSplit: {
    flexDirection: "column",
  },
  videoFullscreen: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  videoHalf: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    marginVertical: 1,
  },
  videoGrid2col: {
    width: "50%",
    aspectRatio: 1,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#0D0D0D",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  roomTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  viewerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  viewerCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 10,
  },
  controlBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: "center",
  },
  controlBtnActive: {
    backgroundColor: "rgba(239,68,68,0.4)",
  },
  controlBtnLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  leaveBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 30,
    paddingHorizontal: 28,
    height: 60,
    justifyContent: "center",
  },
  leaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  connectingText: {
    color: "#6B7280",
    fontSize: 15,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 15,
    textAlign: "center",
  },
  endedEmoji: {
    fontSize: 56,
  },
  endedTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2D2D2D",
  },
  endedSubtext: {
    fontSize: 14,
    color: "#6B7280",
  },
  backBtnFull: {
    backgroundColor: "#89CFF0",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  backBtnText: {
    color: "#2D2D2D",
    fontWeight: "700",
    fontSize: 15,
  },
});
