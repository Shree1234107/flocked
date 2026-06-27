// Native implementation — LiveKitRoom + VideoTrack from @livekit/react-native,
// hooks from @livekit/components-react (native's LiveKitRoom sets up the same context)

export {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
} from "@livekit/react-native";

export {
  useParticipants,
  useLocalParticipant,
  useTracks,
  AudioTrack,
} from "@livekit/components-react";

// Audio on native is handled by LiveKitRoom itself — no renderer needed
export function RoomAudioRenderer() {
  return null;
}

export { ConnectionState, Track } from "livekit-client";
