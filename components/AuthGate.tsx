import { Redirect } from "expo-router";
import { PropsWithChildren } from "react";
import { ActivityIndicator } from "react-native-paper";

import { Screen } from "./Screen";
import { useAuth } from "../lib/auth";

export function AuthGate({ children }: PropsWithChildren) {
  // TODO: re-enable auth before launch
  if (process.env.EXPO_PUBLIC_DEV_BYPASS_EMAIL) {
    return <>{children}</>;
  }

  const { session, loading } = useAuth();

  if (loading) {
    return (
      <Screen centered>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}
