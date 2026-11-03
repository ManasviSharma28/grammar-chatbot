import { useState } from 'react';
import { useColorScheme } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ChatProvider } from '@/features/chat/chat-store';
import { useTheme } from '@/hooks/use-theme';
import { createChatApi } from '@/lib/api/client';

export default function RootLayout() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const theme = useTheme();
  const [api] = useState(createChatApi);
  const navigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...navigationTheme,
        colors: { ...navigationTheme.colors, background: theme.background, card: theme.background, primary: theme.accent },
      }}>
      <KeyboardProvider>
        <ChatProvider api={api}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerTransparent: false,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.accent,
              headerTitleStyle: { color: theme.text },
              contentStyle: { backgroundColor: theme.background },
            }}>
            <Stack.Screen name="index" options={{ title: 'English Coach' }} />
            <Stack.Screen name="history" options={{ title: 'History' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="practice" options={{ title: 'Practice Lab' }} />
          </Stack>
        </ChatProvider>
      </KeyboardProvider>
    </ThemeProvider>
  );
}
