import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  List,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { listMyGuilds } from '../qq/api';
import { Scene } from '../qq/protocol';
import { useStore } from '../store';
import { Helper, Section } from './kit';
import { spacing, type AppTheme } from './theme';

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
  const theme = useTheme<AppTheme>();
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
    <View style={styles.flex}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title="新建会话" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="选择场景" description={current.hint}>
          <SegmentedButtons
            value={scene}
            onValueChange={(v) => setScene(v as Scene)}
            buttons={SCENES.map((s) => ({ value: s.key, label: s.label }))}
          />
        </Section>

        {scene === 'channel' ? (
          <Section
            title="我加入的频道"
            description="只能选到频道本身，进频道后可在子频道列表里找 channel_id（子频道 id）。"
            action={
              <Button compact mode="text" loading={loading} onPress={loadGuilds}>
                加载
              </Button>
            }
          >
            {guilds && guilds.length > 0 ? (
              guilds.map((g) => (
                <List.Item
                  key={g.id}
                  title={g.name}
                  description={g.id}
                  descriptionNumberOfLines={1}
                  left={(props) => <List.Icon {...props} icon="hash" />}
                />
              ))
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {loading ? '加载中…' : '还没加载，或该机器人没有加入任何频道'}
              </Text>
            )}
          </Section>
        ) : null}

        <Section title="会话信息">
          <TextInput
            mode="outlined"
            label="目标 ID"
            value={targetId}
            onChangeText={setTargetId}
            placeholder={current.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Helper>{current.hint}</Helper>

          <View style={{ height: spacing.lg }} />

          <TextInput
            mode="outlined"
            label="会话备注名（可选）"
            value={title}
            onChangeText={setTitle}
            placeholder="例如：技术交流群"
          />

          <Button
            mode="contained"
            icon="arrow-right"
            style={styles.submit}
            onPress={submit}
          >
            创建并进入
          </Button>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  submit: { marginTop: spacing.lg },
});