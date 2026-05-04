import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BENCHMARK_CRITERIA_ORDER,
  BENCHMARK_ROW_LABELS_FR,
  COMPETITOR_ILLUSTRATIVE_COLUMNS,
  getAfriWonderMatrixCells,
  type MatrixCell,
} from '../src/config/competitiveMatrix';

const NAVY = '#1a2744';
const PAGE_BG = '#e9eef5';
const CARD_BG = '#ffffff';
const GREY_HEAD = '#7a8b99';
const WHATSAPP_GREEN = '#25d366';
const JUMIA_ORANGE = '#ff6b00';
const WECHAT_GREEN = '#07c160';
const AFW_GOLD = '#ffb020';
const ROW_ALT = '#f7f9fc';

const COL_W = 82;
const CRIT_W = 108;
const HEADER_RADIUS = 10;

function CellIcon({ cell }: { cell: MatrixCell }) {
  if (cell === 'yes') {
    return <Ionicons name="checkmark-circle" size={28} color="#2e7d32" accessibilityLabel="Oui" />;
  }
  if (cell === 'no') {
    return <Ionicons name="close-circle" size={28} color="#c62828" accessibilityLabel="Non" />;
  }
  return <Ionicons name="warning" size={26} color="#f9a825" accessibilityLabel="Partiel" />;
}

const HEADER_COLORS = [GREY_HEAD, WHATSAPP_GREEN, JUMIA_ORANGE, WECHAT_GREEN, AFW_GOLD] as const;

export default function BenchmarkScreen() {
  const insets = useSafeAreaInsets();
  const afwCells = useMemo(() => getAfriWonderMatrixCells(), []);
  const tableWidth = CRIT_W + COL_W * (1 + COMPETITOR_ILLUSTRATIVE_COLUMNS.length);

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.heroTitleBlock}>
          <View style={styles.decorSquares}>
            <View style={styles.decorSq} />
            <View style={styles.decorSq} />
          </View>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>Matrice</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hPad}>
          <View style={[styles.tableCard, { width: tableWidth }]}>
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.headCell,
                  { width: CRIT_W, backgroundColor: HEADER_COLORS[0], borderTopLeftRadius: HEADER_RADIUS },
                ]}
              >
                <Text style={styles.headCellText}>Critère</Text>
              </View>
              {COMPETITOR_ILLUSTRATIVE_COLUMNS.map((c, i) => (
                <View
                  key={c.key}
                  style={[styles.headCell, { width: COL_W, backgroundColor: HEADER_COLORS[i + 1] }]}
                >
                  <Text style={styles.headCellText}>{c.labelFr}</Text>
                </View>
              ))}
              <View
                style={[
                  styles.headCell,
                  {
                    width: COL_W,
                    backgroundColor: HEADER_COLORS[4],
                    borderTopRightRadius: HEADER_RADIUS,
                  },
                ]}
              >
                <Text style={styles.headCellText}>AfriWonder</Text>
              </View>
            </View>

            {BENCHMARK_CRITERIA_ORDER.map((id, rowIdx) => {
              const zebra = rowIdx % 2 === 1 ? ROW_ALT : CARD_BG;
              const isLast = rowIdx === BENCHMARK_CRITERIA_ORDER.length - 1;
              return (
                <View
                  key={id}
                  style={[styles.bodyRow, { backgroundColor: zebra }, isLast && styles.bodyRowLast]}
                >
                  <View style={[styles.critCell, { width: CRIT_W }]}>
                    <Text style={styles.critText}>{BENCHMARK_ROW_LABELS_FR[id]}</Text>
                  </View>
                  {COMPETITOR_ILLUSTRATIVE_COLUMNS.map((col) => (
                    <View key={`${id}-${col.key}`} style={[styles.iconCell, { width: COL_W }]}>
                      <CellIcon cell={col.cells[id]} />
                    </View>
                  ))}
                  <View style={[styles.iconCell, styles.afwCol, { width: COL_W }]}>
                    <CellIcon cell={afwCells[id]} />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTitleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 10,
  },
  decorSquares: { flexDirection: 'row', gap: 4, marginTop: 6 },
  decorSq: { width: 8, height: 8, backgroundColor: '#fff', borderRadius: 2 },
  heroTextCol: { flex: 1 },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    ...(Platform.OS === 'web' ? { fontFamily: 'system-ui' } : {}),
  },
  scroll: { paddingTop: 16 },
  hPad: { paddingHorizontal: 12 },
  tableCard: {
    backgroundColor: CARD_BG,
    borderRadius: HEADER_RADIUS,
    overflow: 'hidden',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  headerRow: { flexDirection: 'row' },
  headCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  headCellText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dde4ec',
  },
  bodyRowLast: {
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
  },
  critCell: {
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e2e8f0',
  },
  critText: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  iconCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e2e8f0',
  },
  afwCol: {
    borderRightWidth: 0,
    backgroundColor: 'rgba(255, 176, 32, 0.08)',
  },
});
