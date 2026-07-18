import { colors } from "../lib/colors";
import "react-native-gesture-handler";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider } from "../lib/auth";
import { RoleProvider } from "../lib/role";
import { FavoritesProvider } from "../lib/favorites";
import { FiltersProvider } from "../lib/filtersContext";
import { fonts } from "../lib/fonts";

SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3LightTheme,
  roundness: 2,
  fonts: {
    ...MD3LightTheme.fonts,
    // Apply DM Sans to react-native-paper typography
    bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontFamily: fonts.regular },
    bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontFamily: fonts.regular },
    bodySmall: { ...MD3LightTheme.fonts.bodySmall, fontFamily: fonts.regular },
    labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontFamily: fonts.medium },
    labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: fonts.medium },
    labelSmall: { ...MD3LightTheme.fonts.labelSmall, fontFamily: fonts.medium },
    titleLarge: { ...MD3LightTheme.fonts.titleLarge, fontFamily: fonts.bold },
    titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: fonts.bold },
    titleSmall: { ...MD3LightTheme.fonts.titleSmall, fontFamily: fonts.medium },
    headlineLarge: { ...MD3LightTheme.fonts.headlineLarge, fontFamily: fonts.bold },
    headlineMedium: { ...MD3LightTheme.fonts.headlineMedium, fontFamily: fonts.bold },
    headlineSmall: { ...MD3LightTheme.fonts.headlineSmall, fontFamily: fonts.bold },
  },
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryTint,
    secondary: colors.primaryTint,
    secondaryContainer: colors.primaryTint,
    background: "#FFFFFF",
    surface: "#F9F9F9",
    surfaceVariant: "#F9F9F9",
    onPrimary: "#FFFFFF",
    outline: "#EEEEEE",
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
                      headerTintColor: colors.navy,
                      headerShadowVisible: false,
                      headerTitleStyle: {
                        fontFamily: fonts.bold,
                        fontWeight: "600",
                        fontSize: 17,
                        color: colors.navy,
                      },
                      headerBackTitleVisible: false,
                    }}
                  >
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="login/guest" options={{ headerShown: false }} />
                    <Stack.Screen name="login/instructor" options={{ headerShown: false }} />
                    <Stack.Screen name="host" options={{ headerShown: false }} />
                    <Stack.Screen name="guest" options={{ headerShown: false }} />
                    <Stack.Screen name="select-role" options={{ headerShown: false }} />
                    <Stack.Screen name="instructor-apply" options={{ headerShown: false }} />
                    <Stack.Screen name="instructor-pending" options={{ headerShown: false }} />
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
