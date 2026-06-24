import React from "react";
import { View, StyleSheet } from "react-native";

// Stub implementations — @livekit/react-native does not run in the browser.

export const AudioSession = {
  startAudioSession: async () => {},
  stopAudioSession: async () => {},
};

export function LiveKitRoom({ children }: { children?: React.ReactNode; [key: string]: unknown }) {
  return React.createElement(React.Fragment, null, children);
}

export function VideoTrack({ style }: { style?: object; [key: string]: unknown }) {
  return React.createElement(
    View,
    { style: [styles.placeholder, style] },
    null
  );
}

export function useLocalParticipant() {
  return {
    localParticipant: null,
    isMicrophoneEnabled: false,
    isCameraEnabled: false,
  };
}

export function useRoomContext() {
  return null;
}

export function useTracks(_sources?: unknown[]) {
  return [];
}

export const ConnectionState = {
  Connected: "connected",
  Connecting: "connecting",
  Disconnected: "disconnected",
  Reconnecting: "reconnecting",
} as const;

export const Track = {
  Source: {
    Camera: "camera",
    Microphone: "microphone",
    ScreenShare: "screen_share",
    ScreenShareAudio: "screen_share_audio",
    Unknown: "unknown",
  },
} as const;

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#1A1A1A",
    flex: 1,
  },
});
