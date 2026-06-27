import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../lib/auth";
import { RoleProvider } from "../lib/role";
import { FavoritesProvider } from "../lib/favorites";
import { FiltersProvider } from "../lib/filtersContext";

const theme = {
  ...MD3LightTheme,
  roundness: 2,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#00B4A6",
    primaryContainer: "#E0F7F5",
    secondary: "#E0F7F5",
    secondaryContainer: "#E0F7F5",
    background: "#FFFFFF",
    surface: "#F9F9F9",
    surfaceVariant: "#F9F9F9",
    onPrimary: "#FFFFFF",
    outline: "#EEEEEE",
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <RoleProvider>
              <FavoritesProvider>
                <FiltersProvider>
                  <StatusBar style="dark" />
                  <Stack
                    screenOptions={{
                      headerTitleAlign: "left",
                      headerStyle: { backgroundColor: "#FFFFFF" },
                      headerTintColor: "#2C2C2C",
                      headerShadowVisible: false,
                      headerTitleStyle: { fontWeight: "600", fontSize: 17, color: "#2C2C2C" },
                      headerBackTitleVisible: false,
                    }}
                  >
                    <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="login/customer" options={{ headerShown: false }} />
                    <Stack.Screen name="login/pro" options={{ headerShown: false }} />
                    <Stack.Screen name="login/guest" options={{ headerShown: false }} />
                    <Stack.Screen name="login/instructor" options={{ headerShown: false }} />
                    <Stack.Screen name="host" options={{ headerShown: false }} />
                    <Stack.Screen name="guest" options={{ headerShown: false }} />
                    <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                    <Stack.Screen name="notification-permission" options={{ headerShown: false }} />
                    <Stack.Screen name="notifications" options={{ title: "Notifications", headerShown: true }} />
                    <Stack.Screen name="settings" options={{ title: "Settings", headerShown: true }} />
                    <Stack.Screen name="faq" options={{ title: "FAQ & Help", headerShown: true }} />
                    <Stack.Screen name="how-it-works" options={{ title: "How It Works", headerShown: true }} />
                    <Stack.Screen name="referral" options={{ headerShown: false }} />
                    <Stack.Screen name="welcome-email" options={{ headerShown: false }} />
                    <Stack.Screen name="language" options={{ headerShown: false }} />
                    <Stack.Screen name="support-chat" options={{ headerShown: false }} />
                  </Stack>
                </FiltersProvider>
              </FavoritesProvider>
            </RoleProvider>
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
