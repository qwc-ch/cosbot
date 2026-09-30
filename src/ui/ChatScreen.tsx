import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PASSIVE_REPLY_WINDOW_MS, Scene } from '../qq/protocol';
import { ChatMessage, useStore } from '../store';
import { Button, colors } from './kit';

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
  const out = msg.dir === 'out';
  return (
    <View style={[styles.row, out ? styles.rowOut : styles.rowIn]}>
      <View style={[styles.bubble, out ? styles.bubbleOut : styles.bubbleIn]}>
        <Text style={styles.bubbleText}>{msg.text}</Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{fmtTime(msg.ts)}</Text>
          {out && msg.state === 'sending' && <Text style={styles.state}>发送中…</Text>}
          {out && msg.state === 'sent' && <Text style={[styles.state, { color: colors.success }]}>已发送</Text>}
          {out && msg.state === 'failed' && (
            <Text style={[styles.state, { color: colors.danger }]}>
              失败：{msg.error ?? '未知错误'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen({ sessionKey, onBack }: { sessionKey: string; onBack: () => void }) {
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

  if (!session) {
    return (
      <View style={styles.flex}>
        <Header title="会话不存在" onBack={onBack} />
        <View style={styles.center}>
          <Text style={styles.emptyText}>该会话已被删除</Text>
        </View>
      </View>
    );
  }

  const canSend = status === 'online';

  return (
    <View style={styles.flex}>
      <Header title={session.title} onBack={onBack} subtitle={SCENE_LABEL[session.scene]} />
      <View style={styles.notice}>
        {canSend ? (
          <>
            <Text style={styles.noticeText}>
              {passiveLeft > 0
                ? `处于被动回复窗口内（剩 ${Math.ceil(passiveLeft / 1000)}s），发送会引用对方最后一条消息`
                : '不在被动回复窗口内，本次为「主动发送」，受 QQ 每日配额限制'}
            </Text>
          </>
        ) : (
          <Text style={[styles.noticeText, { color: colors.danger }]}>
            网关未在线。QQ 要求 bot 保持 websocket 在线才能发送消息。
          </Text>
        )}
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={session.messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble msg={item} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="输入内容，以机器人身份发送…"
            placeholderTextColor={colors.sub}
            multiline
          />
          <Pressable
            style={[styles.send, (!text.trim() || !canSend) && { opacity: 0.4 }]}
            disabled={!text.trim() || !canSend}
            onPress={() => {
              const t = text;
              setText('');
              void sendText(session.key, t);
            }}
          >
            <Text style={styles.sendText}>发送</Text>
          </Pressable>
        </View>
        <View style={styles.quickRow}>
          {['[图片]', '[表情]'].map((q) => (
            <Pressable
              key={q}
              style={styles.quick}
              onPress={() => setText((v) => (v ? `${v}${q}` : q))}
            >
              <Text style={styles.quickText}>{q}</Text>
            </Pressable>
          ))}
          <Button
            title="清空本地记录"
            variant="ghost"
            style={{ marginLeft: 'auto', height: 34 }}
            onPress={() => {
              const cur = useStore.getState().sessions[session.key];
              if (!cur) return;
              useStore.setState({
                sessions: {
                  ...useStore.getState().sessions,
                  [cur.key]: { ...cur, messages: [] },
                },
              });
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Header({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>‹ 返回</Text>
      </Pressable>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </View>
      <View style={{ width: 48 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.sub },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: { width: 48, fontSize: 16, color: colors.primary },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text, maxWidth: 220 },
  headerSub: { fontSize: 11, color: colors.sub, marginTop: 2 },
  notice: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF7E6' },
  noticeText: { fontSize: 11, color: colors.warn, lineHeight: 16 },
  list: { padding: 12, gap: 8 },
  row: { flexDirection: 'row' },
  rowIn: { justifyContent: 'flex-start' },
  rowOut: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleIn: { backgroundColor: colors.bubbleIn },
  bubbleOut: { backgroundColor: colors.bubbleOut },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 21 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'flex-end' },
  time: { fontSize: 10, color: colors.sub },
  state: { fontSize: 10, color: colors.sub, marginLeft: 8 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: '#FAFAFB',
  },
  send: {
    marginLeft: 8,
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: '600' },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: colors.card,
  },
  quick: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF1F5',
    marginRight: 8,
  },
  quickText: { fontSize: 12, color: colors.text },
});
