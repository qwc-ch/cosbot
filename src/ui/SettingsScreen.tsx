import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMe } from '../qq/api';
import { useStore } from '../store';
import { Button, Card, Field, Row, StatusBadge, Switch, colors } from './kit';

export default function SettingsScreen() {
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
      Alert.alert('校验失败', err?.message ?? String(err));
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.statusRow}>
          <Text style={styles.cardTitle}>网关状态</Text>
          <StatusBadge status={status} />
        </View>
        {statusDetail ? <Text style={styles.detail}>{statusDetail}</Text> : null}
        <View style={styles.btnRow}>
          {status === 'idle' || status === 'error' ? (
            <Button title="连接" onPress={connect} style={styles.flexBtn} />
          ) : (
            <Button title="断开" variant="outline" onPress={disconnect} style={styles.flexBtn} />
          )}
          <Button title="校验凭证" variant="outline" onPress={test} style={styles.flexBtn} />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>机器人凭证</Text>
        <Text style={styles.cardDesc}>
          在 q.qq.com → 开放平台 → 我的机器人里获取 AppID 与 AppSecret
        </Text>
        <View style={{ height: 12 }} />
        <Field
          label="AppID"
          value={config.appid}
          onChangeText={(appid) => setConfig({ appid: appid.trim() })}
          placeholder="例如 102xxxxxx"
          hint="凭证保存在本机 AsyncStorage，不会上传到任何第三方"
        />
        <Field
          label="AppSecret"
          value={config.secret}
          onChangeText={(secret) => setConfig({ secret: secret.trim() })}
          placeholder="请输入 AppSecret"
          secureTextEntry
          hint="修改凭证后请点「断开」再「连接」使配置生效"
        />
        <Row label="沙箱环境（仅测试群可用）">
          <Switch value={config.sandbox} onValueChange={(v) => setConfig({ sandbox: v })} />
        </Row>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>订阅事件（Intents）</Text>
        <Text style={styles.cardDesc}>修改后需要重连才能生效</Text>
        <Row label="群 / 单聊消息（public_messages）">
          <Switch value={config.intentGroup} onValueChange={(v) => setConfig({ intentGroup: v })} />
        </Row>
        <Row label="频道 @ 机器人（public_guild_messages）">
          <Switch value={config.intentGuild} onValueChange={(v) => setConfig({ intentGuild: v })} />
        </Row>
        <Row label="频道私信（direct_message）">
          <Switch value={config.intentDM} onValueChange={(v) => setConfig({ intentDM: v })} />
        </Row>
      </Card>

      <Card>
        <View style={styles.statusRow}>
          <Text style={styles.cardTitle}>运行日志</Text>
          <Button title="清空" variant="ghost" onPress={clearLogs} style={{ height: 32 }} />
        </View>
        {logs.length === 0 ? (
          <Text style={styles.cardDesc}>暂无日志</Text>
        ) : (
          logs
            .slice(-60)
            .reverse()
            .map((l) => (
              <Text key={l.id} style={styles.logLine}>
                {new Date(l.ts).toLocaleTimeString()} {l.text}
              </Text>
            ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 32 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardDesc: { fontSize: 12, color: colors.sub, marginTop: 4, lineHeight: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detail: { fontSize: 12, color: colors.sub, marginTop: 6 },
  btnRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
  flexBtn: { flex: 1 },
  logLine: { fontSize: 11, color: colors.sub, marginTop: 4, lineHeight: 15 },
});
