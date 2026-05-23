import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { SettingsScreen } from '../../src/components/settings/SettingsScreen';
import { SettingsRow, SettingsSection } from '../../src/components/settings/SettingsRow';
import usePrivacySettings from '../../src/hooks/usePrivacySettings';

const SCREEN_TIME_OPTIONS: (number | null)[] = [null, 30, 60, 90, 120];
const BREAK_OPTIONS: (number | null)[] = [null, 10, 20, 30, 60];

function formatMinutes(value: number | null): string {
  if (!value) return 'Off';
  if (value >= 60) {
    const h = Math.floor(value / 60);
    const m = value % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
  return `${value} min`;
}

export default function TimeWellbeingScreen() {
  const { settings, update } = usePrivacySettings();
  const time = settings.time_and_wellbeing;
  const [picker, setPicker] = useState<null | {
    field: 'screen_time_limit_min' | 'break_reminder_min';
    options: (number | null)[];
  }>(null);

  return (
    <SettingsScreen title="Time and well-being">
      <Text style={styles.intro}>
        Set healthy limits to your AfriWonder usage. You will receive a reminder when limits are reached.
      </Text>

      <SettingsSection title="Daily time">
        <SettingsRow
          variant="navigate"
          icon="hourglass-outline"
          label="Daily screen time limit"
          value={formatMinutes(time.screen_time_limit_min)}
          onPress={() =>
            setPicker({ field: 'screen_time_limit_min', options: SCREEN_TIME_OPTIONS })
          }
        />
        <SettingsRow
          variant="navigate"
          icon="cafe-outline"
          label="Break reminders"
          value={formatMinutes(time.break_reminder_min)}
          onPress={() => setPicker({ field: 'break_reminder_min', options: BREAK_OPTIONS })}
        />
      </SettingsSection>

      <SettingsSection title="Content">
        <SettingsRow
          variant="toggle"
          icon="shield-checkmark-outline"
          label="Restricted mode"
          value={time.restricted_mode}
          onValueChange={(v) =>
            void update({ time_and_wellbeing: { ...time, restricted_mode: v } })
          }
        />
      </SettingsSection>

      <Modal transparent visible={picker !== null} animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>
              {picker?.field === 'screen_time_limit_min' ? 'Screen time limit' : 'Break reminders'}
            </Text>
            {picker?.options.map((opt) => {
              const selected = picker
                ? time[picker.field] === opt
                : false;
              return (
                <TouchableOpacity
                  key={String(opt)}
                  style={styles.sheetItem}
                  onPress={() => {
                    if (!picker) return;
                    void update({ time_and_wellbeing: { ...time, [picker.field]: opt } });
                    setPicker(null);
                  }}
                >
                  <Text style={[styles.sheetItemText, selected && styles.sheetItemSelected]}>
                    {formatMinutes(opt)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPicker(null)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#5F5F5F', fontSize: 13, paddingHorizontal: 18, paddingTop: 14, lineHeight: 19 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', paddingTop: 8, paddingBottom: 24, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { textAlign: 'center', fontWeight: '700', fontSize: 15, color: '#111', paddingVertical: 12 },
  sheetItem: { paddingVertical: 14, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.07)' },
  sheetItemText: { color: '#111', fontSize: 16 },
  sheetItemSelected: { color: '#FF2D55', fontWeight: '700' },
  sheetCancel: { paddingVertical: 14, marginTop: 6, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.07)' },
  sheetCancelText: { color: '#111', fontSize: 16, fontWeight: '700' },
});
