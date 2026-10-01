/**
 * MD3 共享组件层：把 react-native-paper 的原语收拢成项目里统一的用法。
 * 各页面直接用 paper 的一级组件（Button / TextInput / SegmentedButtons …），
 * 这里只放跨页面复用的复合件。
 */
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { ActivityIndicator, Card, Chip, Icon, Text, useTheme } from 'react-native-paper';

import { spacing, type AppTheme } from './theme';

/** 页面底色容器 */
export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }, style]}>
      {children}
    </View>
  );
}

/** 分组卡片：MD3 filled card + 分组标题 */
export function Section({
  title,
  description,
  action,
  children,
  style,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.section, style]}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? (
            <Text
              variant="labelLarge"
              style={[styles.sectionTitle, { color: theme.colors.primary }]}
            >
              {title}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {action}
        </View>
      ) : null}
      {description ? (
        <Text
          variant="bodySmall"
          style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}
        >
          {description}
        </Text>
      ) : null}
      <Card mode="contained" style={styles.card}>
        <Card.Content>{children}</Card.Content>
      </Card>
    </View>
  );
}

/** 连接状态徽标：MD3 assist chip，busy 时换成转圈 */
export function StatusBadge({ status }: { status: string }) {
  const scheme = statusScheme(status, useTheme<AppTheme>());

  return (
    <Chip
      compact
      selected
      showSelectedCheck={false}
      selectedColor={scheme.onContainer}
      style={[styles.badge, { backgroundColor: scheme.container }]}
      icon={({ color }) => (
        <View style={styles.badgeIcon}>
          {scheme.busy ? (
            <ActivityIndicator size={12} color={color} />
          ) : (
            <View style={[styles.dot, { backgroundColor: color }]} />
          )}
        </View>
      )}
    >
      {scheme.label}
    </Chip>
  );
}

function statusScheme(
  status: string,
  theme: AppTheme,
): { label: string; container: string; onContainer: string; busy: boolean } {
  const c = theme.colors;
  switch (status) {
    case 'online':
      return { label: '在线', container: c.onlineContainer, onContainer: c.onOnlineContainer, busy: false };
    case 'connecting':
    case 'identifying':
      return { label: '连接中', container: c.pendingContainer, onContainer: c.onPendingContainer, busy: true };
    case 'reconnecting':
      return { label: '重连中', container: c.pendingContainer, onContainer: c.onPendingContainer, busy: true };
    case 'error':
      return { label: '错误', container: c.errorContainer, onContainer: c.onErrorContainer, busy: false };
    default:
      return {
        label: '未连接',
        container: c.offlineContainer,
        onContainer: c.onOfflineContainer,
        busy: false,
      };
  }
}

/** 空状态：图标 + 标题 + 说明 */
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Icon source={icon} size={32} color={theme.colors.onSurfaceVariant} />
      </View>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
        {title}
      </Text>
      {description ? (
        <Text
          variant="bodyMedium"
          style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

/** 辅助说明文字 */
export function Helper({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text variant="bodySmall" style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: { flexShrink: 1 },
  sectionDesc: { marginBottom: spacing.sm, lineHeight: 18 },
  card: { borderRadius: 12 },
  badge: { alignSelf: 'flex-start' },
  badgeIcon: { width: 18, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: { textAlign: 'center', lineHeight: 20, marginTop: spacing.sm },
  emptyAction: { marginTop: spacing.lg, alignSelf: 'stretch' },
  helper: { marginTop: spacing.xs, lineHeight: 16 },
});