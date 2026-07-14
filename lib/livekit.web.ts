// Web implementation — uses @livekit/components-react (browser-based)

import React from "react";
import { LiveKitRoom as LKRoom } from "@livekit/components-react";

export const AudioSession = {
  startAudioSession: async () => {},
  stopAudioSession: async () => {},
};

// Wrap LiveKitRoom so its <div> is always a full-height flex column.
// Without this, the unstyled div breaks flex:1 on child RoomUI views,
// causing the control bar to overflow and appear clipped on web.
export function LiveKitRoom({
  style,
  ...props
}: React.ComponentProps<typeof LKRoom>) {
  return (
    <LKRoom
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        ...(style as React.CSSProperties),
      }}
      {...props}
    />
  );
}

export {
  VideoTrack,
  AudioTrack,
  useParticipants,
  useLocalParticipant,
  useTracks,
  RoomAudioRenderer,
} from "@livekit/components-react";

export { Track, ConnectionState, VideoPresets } from "livekit-client";
