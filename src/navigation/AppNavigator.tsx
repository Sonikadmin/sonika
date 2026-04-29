import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import HomeScreen from '../screens/HomeScreen';
import EqualizerScreen from '../screens/EqualizerScreen';
import ProfilesScreen from '../screens/ProfilesScreen';
import HearingDiaryScreen from '../screens/HearingDiaryScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootTabParamList = {
  Home: undefined;
  Equalizer: undefined;
  Profiles: undefined;
  Diary: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home:      ['home', 'home-outline'],
  Equalizer: ['options', 'options-outline'],
  Profiles:  ['layers', 'layers-outline'],
  Diary:     ['bar-chart', 'bar-chart-outline'],
  Settings:  ['settings', 'settings-outline'],
};

const LABELS: Record<string, string> = {
  Home:      'Home',
  Equalizer: 'Equalizer',
  Profiles:  'Profili',
  Diary:     'Diario',
  Settings:  'Impostazioni',
};

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textDisabled,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 80 : SIZES.tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: FONTS.size.xs,
          fontWeight: FONTS.weight.medium,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const [filled, outline] = ICONS[route.name] ?? ['help', 'help-outline'];
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
        tabBarLabel: LABELS[route.name] ?? route.name,
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen} />
      <Tab.Screen name="Equalizer" component={EqualizerScreen} />
      <Tab.Screen name="Profiles"  component={ProfilesScreen} />
      <Tab.Screen name="Diary"     component={HearingDiaryScreen} />
      <Tab.Screen name="Settings"  component={SettingsScreen} />
    </Tab.Navigator>
  );
}
