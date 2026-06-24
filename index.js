import "./lib/crypto-polyfill";

// Calls registerGlobals() on native; no-op on web (livekit.web.ts stub).
import "./lib/livekit-init";

import "expo-router/entry";
