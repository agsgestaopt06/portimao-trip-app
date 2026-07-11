import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LogBox, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { storage } from "@/src/utils/storage";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const [onbChecked, setOnbChecked] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Check first-launch onboarding
  useEffect(() => {
    (async () => {
      const done = await storage.getItem<boolean>("onboarding_done_v1", false);
      const currentPath = segments.join("/");
      if (!done && currentPath !== "onboarding") {
        router.replace("/onboarding" as any);
      }
      setOnbChecked(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if ((loaded || error) && onbChecked) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, onbChecked]);

  if ((!loaded && !error) || !onbChecked) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FDFBF7" } }}>
          <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="restaurants" options={{ presentation: "card" }} />
          <Stack.Screen name="hacks" options={{ presentation: "card" }} />
          <Stack.Screen name="budget" options={{ presentation: "card" }} />
          <Stack.Screen name="checklist" options={{ presentation: "card" }} />
          <Stack.Screen name="gallery" options={{ presentation: "card" }} />
          <Stack.Screen name="diary" options={{ presentation: "card" }} />
          <Stack.Screen name="map" options={{ presentation: "card" }} />
          <Stack.Screen name="kids-activities" options={{ presentation: "card" }} />
          <Stack.Screen name="shopping" options={{ presentation: "card" }} />
          <Stack.Screen name="tickets" options={{ presentation: "card" }} />
          <Stack.Screen name="emergencia" options={{ presentation: "card" }} />
          <Stack.Screen name="beaches" options={{ presentation: "card" }} />
          <Stack.Screen name="activities" options={{ presentation: "card" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
