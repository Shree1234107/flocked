import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native-paper";
import * as SecureStore from "../lib/secure-store";

import { Screen } from "../components/Screen";
import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync("flocked.onboarding_seen").then((val) => {
      setOnboardingSeen(val === "true");
      setOnboardingChecked(true);
    });
  }, []);

  if (!onboardingChecked || authLoading) {
    return (
      <Screen centered>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!onboardingSeen) {
    return <Redirect href="/onboarding" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (roleLoading) {
    return (
      <Screen centered>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (role === "guest") {
    return <Redirect href="/guest" />;
  }

  if (role === "host") {
    return <Redirect href="/host" />;
  }

  // Session exists but no role — send back to login to pick one
  return <Redirect href="/login" />;
}
