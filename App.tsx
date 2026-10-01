import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme } from 'react-native';
import { PaperProvider, useTheme } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import ChatScreen from './src/ui/ChatScreen';
import NewSessionScreen from './src/ui/NewSessionScreen';
import SessionListScreen from './src/ui/SessionListScreen';
import SettingsScreen from './src/ui/SettingsScreen';
import { darkTheme, lightTheme, type AppTheme } from './src/ui/theme';
import { installForegroundReconnect, useStore } from './src/store';

installForegroundReconnect();

type Route =
  | { name: 'sessions' }
  | { name: 'new' }
  | { name: 'settings' }
  | { name: 'chat'; key: string };

/** 会话列表里「新建会话」按钮的哨兵 key */
const NEW_SESSION = '__new__';

export default function App() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <Root />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

function Root() {
  const theme = useTheme<AppTheme>();
  const [route, setRoute] = useState<Route>({ name: 'sessions' });
  const sessions = useStore((s) => s.sessions);
  const unreadTotal = Object.values(sessions).reduce((n, s) => n + s.unread, 0);
  const go = (r: Route) => setRoute(r);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.surface }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {route.name === 'sessions' ? (
        <SessionListScreen
          unreadTotal={unreadTotal}
          onOpen={(key) =>
            go(key === NEW_SESSION ? { name: 'new' } : { name: 'chat', key })
          }
          onOpenSettings={() => go({ name: 'settings' })}
        />
      ) : null}
      {route.name === 'new' ? (
        <NewSessionScreen
          onOpen={(key) => go({ name: 'chat', key })}
          onBack={() => go({ name: 'sessions' })}
        />
      ) : null}
      {route.name === 'chat' ? (
        <ChatScreen sessionKey={route.key} onBack={() => go({ name: 'sessions' })} />
      ) : null}
      {route.name === 'settings' ? (
        <SettingsScreen onBack={() => go({ name: 'sessions' })} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});