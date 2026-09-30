import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import ChatScreen from './src/ui/ChatScreen';
import NewSessionScreen from './src/ui/NewSessionScreen';
import SessionListScreen from './src/ui/SessionListScreen';
import SettingsScreen from './src/ui/SettingsScreen';
import { colors } from './src/ui/kit';
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
  const [route, setRoute] = useState<Route>({ name: 'sessions' });
  const sessions = useStore((s) => s.sessions);
  const unreadTotal = Object.values(sessions).reduce((n, s) => n + s.unread, 0);

  const go = (r: Route) => setRoute(r);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />

      <View style={styles.header}>
        {route.name === 'sessions' ? (
          <>
            <Text style={styles.title}>cosbot{unreadTotal > 0 ? ` (${unreadTotal})` : ''}</Text>
            <TouchableOpacity
              onPress={() => go({ name: 'settings' })}
              hitSlop={10}
            >
              <Text style={styles.headerAction}>设置</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      {route.name === 'sessions' ? (
        <SessionListScreen
          onOpen={(key) =>
            go(key === NEW_SESSION ? { name: 'new' } : { name: 'chat', key })
          }
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

      {route.name === 'settings' && (
        <SettingsScreenWithBack onBack={() => go({ name: 'sessions' })} />
      )}
    </SafeAreaView>
  );
}

function SettingsScreenWithBack({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.flex}>
      <TouchableOpacity style={styles.backBar} onPress={onBack} hitSlop={10}>
        <Text style={styles.backText}>‹ 返回</Text>
      </TouchableOpacity>
      <SettingsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerAction: { fontSize: 15, color: colors.primary },
  backBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backText: { fontSize: 16, color: colors.primary },
});
