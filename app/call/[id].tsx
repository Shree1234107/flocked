import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
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

import { AuthGate } from "../../components/AuthGate";
import { getLiveKitToken } from "../../lib/api";
import { useRole } from "../../lib/role";

class CallErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: (error: Error) => React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[CallErrorBoundary] Caught error:", error.message, info.componentStack);
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
        console.warn("[Call] Enable media failed:", e);
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

function RoomView() {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  return (
    <View style={styles.videoGrid}>
      {tracks
        .filter((t) => t?.publication?.trackSid)
        .map((track) => (
          <VideoTrack
            key={track.publication.trackSid}
            trackRef={track}
            style={styles.video}
          />
        ))}
    </View>
  );
}

function CallControls({ onLeave }: { onLeave: () => void }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [muted, setMuted] = useState(false);

  const toggleMute = async () => {
    const next = !muted;
    try {
      await room?.localParticipant?.setMicrophoneEnabled(!next);
      setMuted(next);
    } catch (e) {
      console.warn("[Call] toggleMute failed:", e);
    }
  };

  return (
    <View style={styles.controls}>
      <Text style={styles.participantText}>
        {(room?.remoteParticipants?.size ?? 0) + 1} participant{(room?.remoteParticipants?.size ?? 0) > 0 ? "s" : ""}
      </Text>
      <View style={styles.controlButtons}>
        <TouchableOpacity
          style={[styles.controlBtn, muted && styles.controlBtnActive]}
          onPress={toggleMute}
          activeOpacity={0.8}
        >
          <Text style={styles.controlBtnText}>{muted ? "🔇" : "🎤"}</Text>
          <Text style={styles.controlBtnLabel}>{muted ? "Unmute" : "Mute"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.leaveBtn} onPress={onLeave} activeOpacity={0.85}>
          <Text style={styles.leaveBtnText}>End call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useRole();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadToken = async () => {
      setError(null);
      try {
        const nextToken = await getLiveKitToken(id);
        setToken(nextToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load token.");
      }
    };
    loadToken();
  }, [id]);

  const livekitUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL;

  const handleLeave = () => {
    if (role === "host") {
      router.replace(`/host/outcome/${id}`);
    } else {
      router.replace(`/guest/call-complete/${id}`);
    }
  };

  return (
    <AuthGate>
      <View style={styles.container}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : !livekitUrl ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>LiveKit URL not configured.</Text>
          </View>
        ) : token ? (
          <LiveKitRoom
            serverUrl={livekitUrl}
            token={token}
            connect
            video={false}
            audio={false}
            onConnected={() => console.log("[Call] LiveKit connected")}
            onDisconnected={handleLeave}
            onError={(err) => {
              console.error("[Call] LiveKit error:", err.message);
              setError(err.message);
            }}
            style={styles.room}
          >
            <CallErrorBoundary
              fallback={(err) => (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Call error: {err.message}</Text>
                </View>
              )}
            >
              <EnableMediaAfterConnect />
              <RoomView />
              <CallControls onLeave={handleLeave} />
            </CallErrorBoundary>
          </LiveKitRoom>
        ) : (
          <View style={styles.connectingContainer}>
            <Text style={styles.connectingEmoji}>📹</Text>
            <Text style={styles.connectingText}>Connecting...</Text>
          </View>
        )}
      </View>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  room: {
    flex: 1,
  },
  videoGrid: {
    flex: 1,
    gap: 4,
  },
  video: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 4,
  },
  controls: {
    backgroundColor: "#1E293B",
    paddingVertical: 16,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  participantText: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  controlButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  controlBtn: {
    alignItems: "center",
    backgroundColor: "#334155",
    borderRadius: 50,
    width: 64,
    height: 64,
    justifyContent: "center",
  },
  controlBtnActive: {
    backgroundColor: "#475569",
  },
  controlBtnText: {
    fontSize: 22,
  },
  controlBtnLabel: {
    color: "#CBD5E1",
    fontSize: 10,
    marginTop: 2,
  },
  leaveBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 50,
    paddingHorizontal: 28,
    height: 64,
    justifyContent: "center",
  },
  leaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  connectingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  connectingEmoji: {
    fontSize: 48,
  },
  connectingText: {
    color: "#94A3B8",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 15,
    textAlign: "center",
  },
});
