import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {
  Appbar,
  Banner,
  Button,
  Divider,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { PASSIVE_REPLY_WINDOW_MS, Scene } from '../qq/protocol';
import { ChatMessage, useStore } from '../store';
import { spacing, type AppTheme } from './theme';

const SCENE_LABEL: Record<Scene, string> = {
  group: 'QQ群',
  c2c: '单聊',
  channel: '频道',
  dm: '频道私信',
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const theme = useTheme<AppTheme>();
  const out = msg.dir === 'out';
  const bubbleColor = out ? theme.colors.primaryContainer : theme.colors.elevation.level1;

  return (
    <View style={[styles.row, out ? styles.rowOut : styles.rowIn]}>
      <Surface elevation={out ? 0 : 1} style={[styles.bubble, { backgroundColor: bubbleColor }]}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
          {msg.text}
        </Text>
        <View style={styles.meta}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {fmtTime(msg.ts)}
          </Text>
          {out && msg.state === 'sending' ? (
            <Text variant="labelSmall" style={[styles.state, { color: theme.colors.onSurfaceVariant }]}>
              发送中…
            </Text>
          ) : null}
          {out && msg.state === 'sent' ? (
            <Text variant="labelSmall" style={[styles.state, { color: theme.colors.online }]}>
              已发送
            </Text>
          ) : null}
          {out && msg.state === 'failed' ? (
            <Text variant="labelSmall" style={[styles.state, { color: theme.colors.error }]}>
              失败：{msg.error ?? '未知错误'}
            </Text>
          ) : null}
        </View>
      </Surface>
    </View>
  );
}

export default function ChatScreen({
  sessionKey,
  onBack,
}: {
  sessionKey: string;
  onBack: () => void;
}) {
  const theme = useTheme<AppTheme>();
  const session = useStore((s) => s.sessions[sessionKey]);
  const sendText = useStore((s) => s.sendText);
  const status = useStore((s) => s.status);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(t);
  }, [session?.messages.length]);

  const passiveLeft = useMemo(() => {
    if (!session?.lastMsgId || !session.lastMsgAt) return 0;
    const left = PASSIVE_REPLY_WINDOW_MS - (Date.now() - session.lastMsgAt);
    return left > 0 ? left : 0;
  }, [session?.lastMsgId, session?.lastMsgAt, session?.messages.length]);

  const canSend = status === 'online';

  if (!session) {
    return (
      <View style={styles.flex}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onBack} />
          <Appbar.Content title="会话不存在" />
        </Appbar.Header>
        <View style={styles.center}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            该会话已被删除
          </Text>
        </View>
      </View>
    );
  }

  const notice = canSend
    ? passiveLeft > 0
      ? `处于被动回复窗口内（剩 ${Math.ceil(passiveLeft / 1000)}s），发送会引用对方最后一条消息`
      : '不在被动回复窗口内，本次为「主动发送」，受 QQ 每日配额限制'
    : '网关未在线。QQ 要求 bot 保持 websocket 在线才能发送消息。';

  return (
    <View style={styles.flex}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title={session.title} subtitle={SCENE_LABEL[session.scene]} />
      </Appbar.Header>

      <Banner
        visible
        icon={canSend ? 'information-outline' : 'alert-circle-outline'}
        style={{
          backgroundColor: canSend
            ? theme.colors.secondaryContainer
            : theme.colors.errorContainer,
        }}
        theme={{
          colors: {
            onSurface: canSend ? theme.colors.onSecondaryContainer : theme.colors.onErrorContainer,
          },
        }}
      >
        <Text
          variant="bodySmall"
          style={{
            color: canSend ? theme.colors.onSecondaryContainer : theme.colors.onErrorContainer,
          }}
        >
          {notice}
        </Text>
      </Banner>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={session.messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble msg={item} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                还没有消息，先说点什么吧
              </Text>
            </View>
          }
        />

        <Surface elevation={3} style={styles.composer}>
          <TextInput
            mode="flat"
            value={text}
            onChangeText={setText}
            placeholder="输入内容，以机器人身份发送…"
            multiline
            style={styles.input}
            contentStyle={styles.inputContent}
            underlineColor="transparent"
            activeUnderlineColor={theme.colors.primary}
            right={
              <TextInput.Icon
                icon="send"
                disabled={!text.trim() || !canSend}
                onPress={() => {
                  const t = text;
                  setText('');
                  void sendText(session.key, t);
                }}
              />
            }
          />
          <Divider />
          <View style={styles.quickRow}>
            {['[图片]', '[表情]'].map((q) => (
              <Button
                key={q}
                compact
                mode="text"
                onPress={() => setText((v) => (v ? `${v}${q}` : q))}
              >
                {q}
              </Button>
            ))}
            <View style={styles.flex} />
            <Button
              compact
              mode="text"
              textColor={theme.colors.error}
              icon="delete-outline"
              onPress={() => {
                useStore.setState((s) => ({
                  sessions: { ...s.sessions, [session.key]: { ...s.sessions[session.key], messages: [] } },
                }));
              }}
            >
              清空记录
            </Button>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  row: { flexDirection: 'row' },
  rowIn: { justifyContent: 'flex-start' },
  rowOut: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, justifyContent: 'flex-end' },
  state: { marginLeft: spacing.sm },
  composer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  input: { backgroundColor: 'transparent' },
  inputContent: { paddingTop: spacing.sm },
  quickRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
});