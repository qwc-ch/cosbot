import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Appbar, Badge, FAB, List, Surface, Text, useTheme } from 'react-native-paper';

import { useStore, type Session } from '../store';
import { Scene } from '../qq/protocol';
import { EmptyState } from './kit';
import { spacing, type AppTheme } from './theme';

/** 会话列表里「新建会话」按钮的哨兵 key，与 App.tsx 中一致 */
const NEW_SESSION = '__new__';

const SCENE_LABEL: Record<Scene, string> = {
  group: 'QQ群',
  c2c: '单聊',
  channel: '频道',
  dm: '频道私信',
};

const SCENE_ICON: Record<Scene, string> = {
  group: 'account-group-outline',
  c2c: 'account-outline',
  channel: 'hash',
  dm: 'email-outline',
};

export default function SessionListScreen({
  onOpen,
  onOpenSettings,
  unreadTotal,
}: {
  onOpen: (key: string) => void;
  onOpenSettings: () => void;
  unreadTotal: number;
}) {
  const theme = useTheme<AppTheme>();
  const sessions = useStore((s) => s.sessions);
  const markRead = useStore((s) => s.markRead);

  const list = useMemo(
    () => Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  return (
    <View style={styles.flex}>
      <Appbar.Header>
        <Appbar.Content title="cosbot" titleStyle={styles.appTitle} />
        {unreadTotal > 0 ? (
          <Badge style={styles.titleBadge}>{unreadTotal}</Badge>
        ) : null}
        <Appbar.Action icon="cog-outline" onPress={onOpenSettings} />
      </Appbar.Header>

      <FlatList
        data={list}
        keyExtractor={(item) => item.key}
        contentContainerStyle={list.length === 0 ? styles.listEmpty : styles.list}
        ListHeaderComponent={
          list.length === 0 ? null : (
            <Text variant="bodySmall" style={[styles.tip, { color: theme.colors.onSurfaceVariant }]}>
              共 {list.length} 个会话，{unreadTotal} 条未读
            </Text>
          )
        }
        ListEmptyComponent={
          <EmptyState
            icon="message-text-outline"
            title="还没有会话"
            description={
              '别人 @ 机器人或给你发消息后，会话会自动出现在这里。\n也可以点右下角按钮手动新建会话直接发消息。'
            }
          />
        }
        renderItem={({ item }) => (
          <SessionRow
            item={item}
            onPress={() => {
              markRead(item.key);
              onOpen(item.key);
            }}
          />
        )}
      />

      <FAB
        icon="plus"
        label="新建会话"
        style={styles.fab}
        onPress={() => onOpen(NEW_SESSION)}
      />
    </View>
  );
}

function SessionRow({ item, onPress }: { item: Session; onPress: () => void }) {
  const theme = useTheme<AppTheme>();
  const preview = item.messages[item.messages.length - 1]?.text ?? '暂无消息';

  return (
    <Surface
      elevation={1}
      style={[styles.row, { backgroundColor: theme.colors.elevation.level1 }]}
    >
      <List.Item
        title={item.title}
        description={preview}
        titleNumberOfLines={1}
        descriptionNumberOfLines={1}
        onPress={onPress}
        left={(props) => (
          <List.Icon
            {...props}
            icon={SCENE_ICON[item.scene]}
            style={{ backgroundColor: theme.colors.secondaryContainer }}
          />
        )}
        right={() => (
          <View style={styles.rowRight}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {SCENE_LABEL[item.scene]}
            </Text>
            {item.unread > 0 ? (
              <Badge size={20} style={{ backgroundColor: theme.colors.error }}>
                {item.unread}
              </Badge>
            ) : null}
          </View>
        )}
        style={styles.listItem}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  appTitle: { fontWeight: '700' },
  titleBadge: { marginRight: spacing.sm },
  list: { padding: spacing.md, paddingBottom: 96 },
  listEmpty: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
  tip: { marginBottom: spacing.sm, marginHorizontal: spacing.xs },
  row: { borderRadius: 12, marginBottom: spacing.sm, overflow: 'hidden' },
  listItem: { paddingHorizontal: spacing.lg },
  rowRight: { alignItems: 'flex-end', justifyContent: 'center', gap: spacing.xs },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});