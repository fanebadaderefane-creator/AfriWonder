import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';

/**
 * Calendrier + horloge cross-platform (web + iOS + Android).
 *
 * - Pas de dépendance native (utilise uniquement RN).
 * - Format `value` : `YYYY-MM-DDTHH:mm` (compatible avec `<input type="datetime-local">`).
 * - Empêche la sélection de dates dans le passé via `minDate` (par défaut maintenant).
 *
 * Utilisé par l'écran "Créer" pour le champ "Programmer la publication".
 */

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const WEEKDAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseIsoLocal(value: string): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBeforeDay(a: Date, b: Date): boolean {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() < b.getFullYear();
  if (a.getMonth() !== b.getMonth()) return a.getMonth() < b.getMonth();
  return a.getDate() < b.getDate();
}

export type DateTimePickerSheetProps = {
  visible: boolean;
  /** Valeur initiale au format `YYYY-MM-DDTHH:mm` ou chaîne vide. */
  value: string;
  /** Date minimale autorisée (défaut : maintenant). */
  minDate?: Date;
  onClose: () => void;
  onConfirm: (value: string) => void;
};

export function DateTimePickerSheet({ visible, value, minDate, onClose, onConfirm }: DateTimePickerSheetProps) {
  const min = useMemo(() => minDate ?? new Date(), [minDate]);

  const initial = useMemo(() => {
    const fromValue = parseIsoLocal(value);
    if (fromValue && fromValue.getTime() >= min.getTime() - 60_000) return fromValue;
    const next = new Date(min.getTime());
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + 60);
    return next;
  }, [value, min]);

  const [cursor, setCursor] = useState<Date>(() => startOfMonth(initial));
  const [selected, setSelected] = useState<Date>(initial);
  const [hour, setHour] = useState<number>(initial.getHours());
  const [minute, setMinute] = useState<number>(initial.getMinutes());

  useEffect(() => {
    if (!visible) return;
    setCursor(startOfMonth(initial));
    setSelected(initial);
    setHour(initial.getHours());
    setMinute(initial.getMinutes());
  }, [visible, initial]);

  const goPrevMonth = () => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    if (next.getFullYear() < min.getFullYear() || (next.getFullYear() === min.getFullYear() && next.getMonth() < min.getMonth())) return;
    setCursor(next);
  };
  const goNextMonth = () => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  };

  const matrix = useMemo(() => {
    const year = cursor.getFullYear();
    const month0 = cursor.getMonth();
    const first = new Date(year, month0, 1);
    /** Lundi = index 0 (Europe). `getDay()` retourne 0 pour dimanche → on remappe. */
    const firstWeekday = (first.getDay() + 6) % 7;
    const days = daysInMonth(year, month0);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(year, month0, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const confirm = () => {
    const final = new Date(selected);
    final.setHours(hour, minute, 0, 0);
    /** Si l'utilisateur sélectionne aujourd'hui à une heure passée, on cale au minimum. */
    if (final.getTime() < min.getTime()) {
      onConfirm(toIsoLocal(min));
    } else {
      onConfirm(toIsoLocal(final));
    }
  };

  const reset = () => {
    onConfirm('');
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={goPrevMonth} hitSlop={10} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS_FR[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <TouchableOpacity onPress={goNextMonth} hitSlop={10} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdaysRow}>
            {WEEKDAYS_FR.map((w, idx) => (
              <Text key={`${w}-${idx}`} style={styles.weekday}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {matrix.map((d, idx) => {
              if (!d) {
                return <View key={`empty-${idx}`} style={styles.cell} />;
              }
              const disabled = isBeforeDay(d, min);
              const isSelected = isSameDay(d, selected);
              return (
                <TouchableOpacity
                  key={`d-${idx}`}
                  style={[styles.cell, isSelected && styles.cellSelected, disabled && styles.cellDisabled]}
                  disabled={disabled}
                  onPress={() => setSelected(new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute))}
                >
                  <Text style={[styles.cellText, isSelected && styles.cellTextSelected, disabled && styles.cellTextDisabled]}>
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.timeLabel}>Heure</Text>
              <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 24 }, (_, i) => i).map((h) => {
                  const sel = h === hour;
                  return (
                    <TouchableOpacity key={`h-${h}`} onPress={() => setHour(h)} style={[styles.timeItem, sel && styles.timeItemSelected]}>
                      <Text style={[styles.timeText, sel && styles.timeTextSelected]}>{pad2(h)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.timeColSep} />
            <View style={styles.timeCol}>
              <Text style={styles.timeLabel}>Minute</Text>
              <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => {
                  const sel = m === minute;
                  return (
                    <TouchableOpacity key={`m-${m}`} onPress={() => setMinute(m)} style={[styles.timeItem, sel && styles.timeItemSelected]}>
                      <Text style={[styles.timeText, sel && styles.timeTextSelected]}>{pad2(m)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={reset} style={styles.actionGhost}>
              <Text style={styles.actionGhostText}>Effacer</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={onClose} style={styles.actionGhost}>
              <Text style={styles.actionGhostText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirm} style={styles.actionPrimary}>
              <Text style={styles.actionPrimaryText}>Programmer</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    paddingTop: 8,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.surface,
  },
  monthLabel: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1.05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  cellDisabled: { opacity: 0.35 },
  cellText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '500' },
  cellTextSelected: { color: '#FFF', fontWeight: '800' },
  cellTextDisabled: { color: Colors.textMuted },
  timeRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  timeCol: { flex: 1 },
  timeColSep: { width: 1, backgroundColor: Colors.border, marginHorizontal: 6 },
  timeLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  timeScroll: { maxHeight: 160 },
  timeItem: { paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  timeItemSelected: { backgroundColor: Colors.primary },
  timeText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
  timeTextSelected: { color: '#FFF', fontWeight: '800' },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.lg,
  },
  actionGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  actionGhostText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '700' },
  actionPrimary: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  actionPrimaryText: { color: '#FFF', fontWeight: '800', fontSize: FontSizes.sm },
});

export default DateTimePickerSheet;
