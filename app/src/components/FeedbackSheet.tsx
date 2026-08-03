import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { capture } from '../lib/analytics';
import { supabase } from '../lib/supabase';
import { colors, radii, spacing } from '../theme';
import type { Lesson } from '../types';

const CATEGORIES = [
  { key: 'content_error', label: 'Incorrect content' },
  { key: 'typo', label: 'Typo / wording' },
  { key: 'playback', label: 'Playback issue' },
  { key: 'other', label: 'Other' },
];

interface Props {
  lesson: Lesson | null;
  onClose: () => void;
}

/**
 * Bug/feedback sheet opened by long-pressing a lesson (REQ-022).
 * Screenshot attachment is deferred: capturing requires react-native-view-shot
 * and upload storage; the report carries lesson id + free text for now.
 */
export default function FeedbackSheet({ lesson, onClose }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!lesson || !category) return;
    capture('lesson_reported', { lessonId: lesson.id, category });
    if (supabase) {
      try {
        await supabase.from('lesson_reports').insert({
          lesson_id: lesson.id,
          category,
          message: message.trim() || null,
        });
      } catch {
        // report captured in analytics regardless
      }
    }
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setCategory(null);
      setMessage('');
      onClose();
    }, 900);
  };

  return (
    <Modal visible={lesson !== null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropTouch} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          {sent ? (
            <Text style={styles.thanks}>Thanks — report sent ✓</Text>
          ) : (
            <>
              <Text style={styles.title}>Report an issue</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {lesson?.title}
              </Text>
              <View style={styles.chips}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.key}
                    style={[styles.chip, category === c.key && styles.chipActive]}
                    onPress={() => setCategory(c.key)}
                  >
                    <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Tell us more (optional)"
                placeholderTextColor={colors.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
              />
              <Pressable
                style={[styles.submit, !category && styles.submitDisabled]}
                disabled={!category}
                onPress={() => void submit()}
              >
                <Text style={styles.submitText}>Send report</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  input: {
    minHeight: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    padding: spacing.md,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  submit: {
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  thanks: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
