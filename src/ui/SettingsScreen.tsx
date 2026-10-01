import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Divider,
  List,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { getMe } from '../qq/api';
import { useStore } from '../store';
import { Helper, Section, StatusBadge } from './kit';
import { spacing, type AppTheme } from './theme';

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme<AppTheme>();
  const config = useStore((s) => s.config);
  const status = useStore((s) => s.status);
  const statusDetail = useStore((s) => s.statusDetail);
  const setConfig = useStore((s) => s.setConfig);
  const connect = useStore((s) => s.connect);
  const disconnect = useStore((s) => s.disconnect);
  const pushLog = useStore((s) => s.pushLog);
  const clearLogs = useStore((s) => s.clearLogs);
  const logs = useStore((s) => s.logs);

  const test = async () => {
    try {
      pushLog('正在校验凭证...');
      const me = await getMe(config);
      pushLog(`凭证有效：${me.username ?? '(未知名称)'} / ${me.id ?? ''}`);
    } catch (err: any) {
      pushLog(`校验失败：${err?.message ?? err}`);
    }
  };

  const connected = status !== 'idle' && status !== 'error';

  return (
    <View style={styles.flex}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title="设置" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="网关">
          <View style={styles.statusRow}>
            <Text variant="titleMedium">网关状态</Text>
            <StatusBadge status={status} />
          </View>
          {statusDetail ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {statusDetail}
            </Text>
          ) : null}
          <View style={styles.btnRow}>
            {connected ? (
              <Button
                mode="outlined"
                icon="link-off"
                style={styles.flexBtn}
                onPress={disconnect}
              >
                断开
              </Button>
            ) : (
              <Button mode="contained" icon="link-variant" style={styles.flexBtn} onPress={connect}>
                连接
              </Button>
            )}
            <Button
              mode="outlined"
              icon="shield-check-outline"
              style={styles.flexBtn}
              onPress={test}
            >
              校验凭证
            </Button>
          </View>
        </Section>

        <Section
          title="机器人凭证"
          description="在 q.qq.com → 开放平台 → 我的机器人里获取 AppID 与 AppSecret。凭证保存在本机 AsyncStorage，不会上传到任何第三方。"
        >
          <TextInput
            mode="outlined"
            label="AppID"
            value={config.appid}
            onChangeText={(appid) => setConfig({ appid: appid.trim() })}
            placeholder="例如 102xxxxxx"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Helper>修改凭证后请先「断开」再「连接」使配置生效</Helper>

          <View style={{ height: spacing.lg }} />

          <TextInput
            mode="outlined"
            label="AppSecret"
            value={config.secret}
            onChangeText={(secret) => setConfig({ secret: secret.trim() })}
            placeholder="请输入 AppSecret"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Section>

        <Section title="订阅事件" description="Intents 决定机器人能收到哪些消息，修改后需要重连才能生效。">
          <List.Item
            title="群 / 单聊消息"
            description="public_messages"
            left={(props) => <List.Icon {...props} icon="account-group-outline" />}
            right={() => (
              <Switch
                value={config.intentGroup}
                onValueChange={(v) => setConfig({ intentGroup: v })}
              />
            )}
          />
          <Divider />
          <List.Item
            title="频道 @ 机器人"
            description="public_guild_messages"
            left={(props) => <List.Icon {...props} icon="at" />}
            right={() => (
              <Switch
                value={config.intentGuild}
                onValueChange={(v) => setConfig({ intentGuild: v })}
              />
            )}
          />
          <Divider />
          <List.Item
            title="频道私信"
            description="direct_message"
            left={(props) => <List.Icon {...props} icon="email-outline" />}
            right={() => (
              <Switch
                value={config.intentDM}
                onValueChange={(v) => setConfig({ intentDM: v })}
              />
            )}
          />
          <Divider />
          <List.Item
            title="沙箱环境"
            description="仅测试群可用"
            left={(props) => <List.Icon {...props} icon="flask-outline" />}
            right={() => (
              <Switch
                value={config.sandbox}
                onValueChange={(v) => setConfig({ sandbox: v })}
              />
            )}
          />
        </Section>

        <Section
          title="运行日志"
          action={
            logs.length > 0 ? (
              <Button compact mode="text" onPress={clearLogs}>
                清空
              </Button>
            ) : null
          }
        >
          {logs.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              暂无日志
            </Text>
          ) : (
            <View style={styles.logBox}>
              {logs
                .slice(-60)
                .reverse()
                .map((l) => (
                  <Text
                    key={l.id}
                    variant="bodySmall"
                    style={[styles.logLine, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {new Date(l.ts).toLocaleTimeString()} {l.text}
                  </Text>
                ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  btnRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.md },
  flexBtn: { flex: 1 },
  logBox: { maxHeight: 260 },
  logLine: { lineHeight: 18 },
});