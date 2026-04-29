import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import HomeScreen from '../screens/HomeScreen';
import EqualizerScreen from '../screens/EqualizerScreen';
import HearingDiaryScreen from '../screens/HearingDiaryScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootTabParamList = {
  Home:      undefined;
  Equalizer: undefined;
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
  { name: 'Home',      label: 'Home',          icon: 'home',          iconOutline: 'home-outline',          component: HomeScreen },
  { name: 'Equalizer', label: 'Audio',          icon: 'headset',       iconOutline: 'headset-outline',       component: EqualizerScreen },
  { name: 'Diary',     label: 'Diario',         icon: 'document-text', iconOutline: 'document-text-outline', component: HearingDiaryScreen },
  { name: 'Settings',  label: 'Impostazioni',   icon: 'settings',      iconOutline: 'settings-outline',      component: SettingsScreen },
];

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => t.name === route.name)!;
        return {
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textDisabled,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 82 : SIZES.tabBarHeight,
            paddingBottom: Platform.OS === 'ios' ? 22 : 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: FONTS.size.xs,
            fontWeight: FONTS.weight.medium,
          },
          tabBarLabel: tab.label,
          tabBarIcon: ({ focused, color, size }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Ionicons
                name={focused ? tab.icon : tab.iconOutline}
                size={size}
                color={color}
              />
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
  activeIconWrap: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
