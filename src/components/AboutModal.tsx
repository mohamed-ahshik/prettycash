import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { Icon } from './Icon';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: AboutModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>About PrettyCash</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.badgeWrap}>
            <View style={styles.appIconCircle}>
              <Icon name="cash-multiple" size={32} color={colors.primaryForeground} />
            </View>
            <Text style={styles.appName}>PrettyCash</Text>
            <Text style={styles.version}>Version 1.0.0 (Build 1)</Text>
          </View>

          <Text style={styles.description}>
            PrettyCash is a modern, lightweight personal budget and expense tracking application
            designed for speed, clarity, and peace of mind.
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fonts.bold,
    letterSpacing: -0.3,
    color: colors.foreground,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: colors.muted,
  },
  badgeWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  appIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  version: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
});
