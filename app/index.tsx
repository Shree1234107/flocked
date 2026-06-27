import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native-paper";

import { Screen } from "../components/Screen";
import { useAuth } from "../lib/auth";
import { useRole } from "../lib/role";

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  if (authLoading) {
    return (
      <Screen centered>
        <ActivityIndicator />
      </Screen>
    );
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
