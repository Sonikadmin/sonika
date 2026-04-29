import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    Notifications.requestPermissionsAsync();
    // Controlla aggiornamenti dopo 3 secondi (lascia caricare l'app)
    const timer = setTimeout(async () => {
      const update = await checkForUpdate();
      if (update) setPendingUpdate(update);
    }, 3000);
    return () => clearTimeout(timer);
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
