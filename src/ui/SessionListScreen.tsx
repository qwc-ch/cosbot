import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '../store';
import { Scene } from '../qq/protocol';
import { Button, colors } from './kit';

/** 会话列表里「新建会话」按钮的哨兵 key，与 App.tsx 中一致 */
const NEW_SESSION = '__new__';

const SCENE_LABEL: Record<Scene, string> = {
  group: 'QQ群',
  c2c: '单聊',
  channel: '频道',
  dm: '频道私信',
};

export default function SessionListScreen({ onOpen }: { onOpen: (key: string) => void }) {
  const sessions = useStore((s) => s.sessions);
  const markRead = useStore((s) => s.markRead);

  const list = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);
  const totalUnread = list.reduce((n, s) => n + s.unread, 0);

  return (
    <View style={styles.flex}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          totalUnread > 0 ? (
            <Text style={styles.tip}>
              共 {list.length} 个会话，{totalUnread} 条未读
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>还没有会话</Text>
            <Text style={styles.emptyText}>
              别人 @ 机器人或给你发消息后，会话会自动出现在这里。{'\n'}也可以在下方手动新建会话直接发消息。
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
            onPress={() => {
              markRead(item.key);
              onOpen(item.key);
            }}
          >
            <View style={styles.itemMain}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.unread}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemPreview} numberOfLines={1}>
                {item.messages[item.messages.length - 1]?.text ?? '暂无消息'}
              </Text>
            </View>
            <Text style={styles.sceneTag}>{SCENE_LABEL[item.scene]}</Text>
          </Pressable>
        )}
      />
      <View style={styles.footer}>
        <Button title="新建会话" variant="outline" onPress={() => onOpen(NEW_SESSION)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 12, paddingBottom: 8 },
  tip: { fontSize: 12, color: colors.sub, marginBottom: 8 },
  empty: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 13, color: colors.sub, textAlign: 'center', lineHeight: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemMain: { flex: 1, marginRight: 10 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flexShrink: 1 },
  itemPreview: { fontSize: 13, color: colors.sub, marginTop: 4 },
  unread: {
    marginLeft: 8,
    backgroundColor: colors.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sceneTag: {
    fontSize: 11,
    color: colors.primary,
    backgroundColor: '#E7F2FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  footer: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
