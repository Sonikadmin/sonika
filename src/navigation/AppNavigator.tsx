import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import HomeScreen from '../screens/HomeScreen';
import EqualizerScreen from '../screens/EqualizerScreen';
import ProfilesScreen from '../screens/ProfilesScreen';
import HearingDiaryScreen from '../screens/HearingDiaryScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootTabParamList = {
  Home:      undefined;
  Equalizer: undefined;
  Profiles:  undefined;
  Diary:     undefined;
  Settings:  undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Array<{
  name: keyof RootTabParamList;
  label: string;
  icon: IconName;
  iconOutline: IconName;
  component: React.ComponentType<any>;
}> = [
  { name: 'Home',      label: 'Home',         icon: 'home',          iconOutline: 'home-outline',          component: HomeScreen },
  { name: 'Equalizer', label: 'Audio',        icon: 'headset',       iconOutline: 'headset-outline',       component: EqualizerScreen },
  { name: 'Profiles',  label: 'Profili',      icon: 'people',        iconOutline: 'people-outline',        component: ProfilesScreen },
  { name: 'Diary',     label: 'Diario',       icon: 'document-text', iconOutline: 'document-text-outline', component: HearingDiaryScreen },
  { name: 'Settings',  label: 'Impostazioni', icon: 'settings',      iconOutline: 'settings-outline',      component: SettingsScreen },
];

export function AppNavigator() {
  // Edge-to-edge (Android 15+/iOS): la tab bar deve includere l'inset
  // dei pulsanti/gesture di sistema, altrimenti ci finiscono sopra.
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => t.name === route.name)!;
        return {
          headerShown: false,
          tabBarActiveTintColor: COLORS.cyan,
          tabBarInactiveTintColor: COLORS.textDisabled,
          tabBarStyle: {
            backgroundColor: '#0A0D26F2',
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: SIZES.tabBarHeight + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: FONTS.size.xs,
            fontWeight: FONTS.weight.medium,
          },
          tabBarLabel: tab.label,
          tabBarIcon: ({ focused, color, size }) => (
            <View style={styles.iconWrap}>
              <Ionicons
                name={focused ? tab.icon : tab.iconOutline}
                size={size}
                color={color}
              />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        };
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
  },
  activeDot: {
    position: 'absolute',
    top: -8,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.cyan,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
});
