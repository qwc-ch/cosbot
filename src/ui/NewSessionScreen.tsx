import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listMyGuilds } from '../qq/api';
import { Scene } from '../qq/protocol';
import { useStore } from '../store';
import { Button, Card, Field, colors } from './kit';

const SCENES: Array<{ key: Scene; label: string; hint: string; placeholder: string }> = [
  {
    key: 'group',
    label: 'QQ群',
    hint: 'group_openid，可在群聊里 @机器人 后从日志或消息中获取；主动发送受每日配额限制',
    placeholder: 'group_openid',
  },
  {
    key: 'c2c',
    label: '单聊',
    hint: '好友的 openid，同群聊一样先 @机器人 拿一次 id',
    placeholder: 'user openid',
  },
  {
    key: 'channel',
    label: '频道',
    hint: '子频道 channel_id，主动推送每个子频道每日限 2 条',
    placeholder: 'channel_id',
  },
];

export default function NewSessionScreen({
  onOpen,
  onBack,
}: {
  onOpen: (key: string) => void;
  onBack: () => void;
}) {
  const [scene, setScene] = useState<Scene>('group');
  const [targetId, setTargetId] = useState('');
  const [title, setTitle] = useState('');
  const [guilds, setGuilds] = useState<Array<{ id: string; name: string }> | null>(null);
  const [loading, setLoading] = useState(false);

  const config = useStore((s) => s.config);
  const status = useStore((s) => s.status);
  const addManualSession = useStore((s) => s.addManualSession);

  const current = SCENES.find((s) => s.key === scene)!;

  const loadGuilds = async () => {
    setLoading(true);
    try {
      const list = await listMyGuilds(config);
      setGuilds(list);
      if (list.length === 0) {
        Alert.alert('没有频道', '该机器人尚未加入任何 QQ 频道');
      }
    } catch (err: any) {
      Alert.alert('获取失败', err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    const id = targetId.trim();
    if (!id) {
      Alert.alert('缺少目标 id', '请先填写目标 id');
      return;
    }
    if (status !== 'online') {
      Alert.alert('网关未连接', '请先在设置页连接网关，否则发送会失败');
    }
    const key = addManualSession(scene, id, title.trim() || id);
    setTargetId('');
    setTitle('');
    onOpen(key);
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.cardTitle}>选择场景</Text>
        <View style={styles.tabs}>
          {SCENES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setScene(s.key)}
              style={[styles.tab, scene === s.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, scene === s.key && styles.tabTextActive]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{current.hint}</Text>
      </Card>

      {scene === 'channel' && (
        <Card>
          <Text style={styles.cardTitle}>我加入的频道</Text>
          <Text style={styles.hint}>
            只能选到频道本身，进频道后可在子频道列表里找 channel_id（子频道 id）。
          </Text>
          <View style={{ height: 10 }} />
          <Button
            title={loading ? '加载中...' : '加载频道列表'}
            variant="outline"
            onPress={loadGuilds}
          />
          {guilds?.map((g) => (
            <View key={g.id} style={styles.guildRow}>
              <Text style={styles.guildName}>{g.name}</Text>
              <Text style={styles.guildId} numberOfLines={1}>
                {g.id}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <Field
          label="目标 ID"
          value={targetId}
          onChangeText={setTargetId}
          placeholder={current.placeholder}
          hint={current.hint}
        />
        <Field
          label="会话备注名（可选）"
          value={title}
          onChangeText={setTitle}
          placeholder="例如：技术交流群"
        />
        <Button title="创建并进入" onPress={submit} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 32 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.sub, marginTop: 8, lineHeight: 18 },
  tabs: { flexDirection: 'row', marginTop: 12, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EFF1F5',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, color: colors.text },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  guildRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  guildName: { fontSize: 14, color: colors.text, fontWeight: '600' },
  guildId: { fontSize: 11, color: colors.sub, marginTop: 2 },
});
