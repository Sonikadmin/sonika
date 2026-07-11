import 'react-native-gesture-handler';
// Must be imported before TaskManager tasks are used
import './src/services/BackgroundUpdateService';

import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';
import { UpdateModal } from './src/components/UpdateModal';
import { checkForUpdate, UpdateInfo } from './src/services/UpdateService';
import {
  registerBackgroundUpdate,
  extractUpdateFromNotification,
} from './src/services/BackgroundUpdateService';
import { initEngineSync } from './src/services/EngineSync';
import { initCrashLog } from './src/services/CrashLog';
import { initExposureGuard } from './src/services/ExposureGuard';
import { OnboardingModal } from './src/components/OnboardingModal';

initCrashLog();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const navTheme = {
  dark: true,
  colors: {
    primary:      COLORS.primary,
    background:   COLORS.background,
    card:         COLORS.surface,
    text:         COLORS.text,
    border:       COLORS.border,
    notification: COLORS.accent,
  },
};

export default function App() {
  const [pendingUpdate, setPendingUpdate] = useState<UpdateInfo | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener    = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Sync store → native engine (EQ, volumi, amplificazione in tempo reale)
    const unsubEngineSync = initEngineSync();
    // Promemoria pausa dopo 2h di amplificazione continua
    const unsubExposure = initExposureGuard();

    Notifications.requestPermissionsAsync();

    // Register background polling task (checks version.json every ~15 min)
    registerBackgroundUpdate().catch(() => {});

    // Handle notification tap when app is foregrounded/opened
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data ?? {};
        const update = extractUpdateFromNotification(
          data as Record<string, unknown>,
        );
        if (update) setPendingUpdate(update);
      },
    );

    // Also handle if a notification arrives while app is in foreground (show modal directly)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        const data = notification.request.content.data ?? {};
        const update = extractUpdateFromNotification(
          data as Record<string, unknown>,
        );
        if (update) setPendingUpdate(update);
      },
    );

    // Check on launch as well (3 s delay so the app can finish loading)
    const timer = setTimeout(async () => {
      const update = await checkForUpdate();
      if (update) setPendingUpdate(update);
    }, 3000);

    return () => {
      unsubEngineSync();
      unsubExposure();
      clearTimeout(timer);
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <AppNavigator />
        </NavigationContainer>
        <StatusBar style="light" />
        {pendingUpdate && (
          <UpdateModal
            update={pendingUpdate}
            onDismiss={() => setPendingUpdate(null)}
          />
        )}
        <OnboardingModal />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
