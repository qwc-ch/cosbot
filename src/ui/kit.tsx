import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch as RNSwitch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

export const colors = {
  bg: '#F5F6F8',
  card: '#FFFFFF',
  primary: '#0084FF',
  primaryDark: '#0068C9',
  text: '#1A1A1A',
  sub: '#8A8F99',
  border: '#E4E6EB',
  danger: '#E5484D',
  success: '#2FB344',
  warn: '#F5A623',
  bubbleIn: '#FFFFFF',
  bubbleOut: '#D8EBFF',
};

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled ?? false;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'outline' && styles.btnOutline,
        variant === 'danger' && styles.btnDanger,
        variant === 'ghost' && styles.btnGhost,
        isDisabled && styles.btnDisabled,
        pressed && !isDisabled && { opacity: 0.7 },
        style,
      ]}
    >
      <Text
        style={[
          styles.btnText,
          (variant === 'outline' || variant === 'ghost') && { color: colors.primary },
          variant === 'danger' && { color: '#fff' },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    idle: { label: '未连接', color: colors.sub },
    connecting: { label: '连接中', color: colors.warn },
    identifying: { label: '鉴权中', color: colors.warn },
    online: { label: '在线', color: colors.success },
    reconnecting: { label: '重连中', color: colors.warn },
    error: { label: '错误', color: colors.danger },
  };
  const it = map[status] ?? { label: status, color: colors.sub };
  return (
    <View style={[styles.badge, { backgroundColor: it.color + '22' }]}>
      {status === 'connecting' || status === 'identifying' || status === 'reconnecting' ? (
        <ActivityIndicator size={10} color={it.color} style={{ marginRight: 4 }} />
      ) : (
        <View style={[styles.dot, { backgroundColor: it.color }]} />
      )}
      <Text style={[styles.badgeText, { color: it.color }]}>{it.label}</Text>
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInputWrapper
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

// 单独包一层，统一样式
function TextInputWrapper(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      style={[styles.input, props.multiline && styles.inputMultiline]}
      placeholderTextColor={colors.sub}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );
}

export function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function Switch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return <RNSwitch value={value} onValueChange={onValueChange} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  btn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnDanger: { backgroundColor: colors.danger },
  btnGhost: { backgroundColor: 'transparent' },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  fieldLabel: {
    fontSize: 13,
    color: colors.sub,
    marginBottom: 6,
    fontWeight: '600',
  },
  fieldHint: { fontSize: 11, color: colors.sub, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#FAFAFB',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLabel: { fontSize: 15, color: colors.text, flex: 1 },
});
