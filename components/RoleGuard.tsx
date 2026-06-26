import { Redirect } from "expo-router";
import { PropsWithChildren } from "react";
import { ActivityIndicator } from "react-native-paper";

import { Screen } from "./Screen";
import { Role, useRole } from "../lib/role";

type RoleGuardProps = PropsWithChildren<{
  requiredRole: Role;
}>;

export function RoleGuard({ requiredRole, children }: RoleGuardProps) {
  // TODO: re-enable auth before launch
  if (process.env.EXPO_PUBLIC_DEV_BYPASS_EMAIL) {
    return <>{children}</>;
  }

  const { role, loading } = useRole();

  if (loading) {
    return (
      <Screen centered>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (role !== requiredRole) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}
