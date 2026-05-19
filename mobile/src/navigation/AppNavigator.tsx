import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LinkWhatsAppScreen from '../screens/LinkWhatsAppScreen';
import ChatListScreen from '../screens/ChatListScreen';
import SummaryRequestScreen from '../screens/SummaryRequestScreen';
import SummaryResultScreen from '../screens/SummaryResultScreen';
import SummaryHistoryScreen from '../screens/SummaryHistoryScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = { Chats: '💬', Summaries: '📋', Link: '🔗' };
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[name]}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#25D366',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#1a1a1a',
      })}
    >
      <Tab.Screen name="Chats" component={ChatListScreen} options={{ title: 'Chats' }} />
      <Tab.Screen name="Summaries" component={SummaryHistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Link" component={LinkWhatsAppScreen} options={{ title: 'WhatsApp' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const token = useAuthStore((s) => s.token);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#1a1a1a' }}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chats' }} />
            <Stack.Screen name="SummaryRequest" component={SummaryRequestScreen}
              options={({ route }) => ({ title: 'New Summary' })} />
            <Stack.Screen name="SummaryResult" component={SummaryResultScreen}
              options={{ title: 'Summary' }} />
            <Stack.Screen name="SummaryHistory" component={SummaryHistoryScreen}
              options={{ title: 'History' }} />
            <Stack.Screen name="LinkWhatsApp" component={LinkWhatsAppScreen}
              options={{ title: 'Link WhatsApp' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
