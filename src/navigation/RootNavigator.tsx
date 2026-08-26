import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { DashboardScreen } from '../screens/DashboardScreen';
import { AllDuesScreen } from '../screens/AllDuesScreen';
import { PeopleScreen } from '../screens/PeopleScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DueDetailsScreen } from '../screens/dues/DueDetailsScreen';
import { DueFormScreen } from '../screens/dues/DueFormScreen';
import { PersonDetailsScreen } from '../screens/people/PersonDetailsScreen';
import { PersonFormScreen } from '../screens/people/PersonFormScreen';
import { CategoriesScreen } from '../screens/settings/CategoriesScreen';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Dues: 'receipt',
  People: 'people',
  Settings: 'settings',
};

function MainTabs() {
  const { colors, typography } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ],
        tabBarLabelStyle: [typography.caption, { fontWeight: '500' }],
        tabBarIcon: ({ focused }) => {
          const base = TAB_ICONS[route.name];
          const name = (focused ? base : `${base}-outline`) as keyof typeof Ionicons.glyphMap;
          return <Ionicons name={name} size={22} color={focused ? colors.accent : colors.textTertiary} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Dues" component={AllDuesScreen} options={{ title: 'Dues' }} />
      <Tab.Screen name="People" component={PeopleScreen} options={{ title: 'People' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="DueDetails" component={DueDetailsScreen} />
      <Stack.Screen name="DueForm" component={DueFormScreen} />
      <Stack.Screen name="PersonDetails" component={PersonDetailsScreen} />
      <Stack.Screen name="PersonForm" component={PersonFormScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    elevation: 0,
    shadowOpacity: 0,
  },
});
