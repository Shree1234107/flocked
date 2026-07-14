// Web implementation — uses @livekit/components-react (browser-based)

export const AudioSession = {
  startAudioSession: async () => {},
  stopAudioSession: async () => {},
};

export {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useParticipants,
  useLocalParticipant,
  useTracks,
  RoomAudioRenderer,
} from "@livekit/components-react";

export { Track, ConnectionState, VideoPresets } from "livekit-client";
