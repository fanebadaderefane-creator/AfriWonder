/** Données statiques du tableau benchmark (lignes, colonnes tierces). La colonne app est calculée via `featureMatrix`. */

export type MatrixCell = 'yes' | 'no' | 'partial';

export const BENCHMARK_CRITERIA_ORDER = [
  'social',
  'marketplace',
  'mobile_money',
  'messaging',
  'low_bandwidth',
  'africa_product',
  'open_engineering',
] as const;

export type BenchmarkCriterionId = (typeof BENCHMARK_CRITERIA_ORDER)[number];

export const BENCHMARK_ROW_LABELS_FR: Record<BenchmarkCriterionId, string> = {
  social: 'Réseau Social',
  marketplace: 'Marketplace',
  mobile_money: 'Paiement Mobile',
  messaging: 'Messagerie',
  low_bandwidth: 'Data Optimisée',
  africa_product: 'Adapté Afrique',
  open_engineering: 'Open/Auditable',
};

export const COMPETITOR_ILLUSTRATIVE_COLUMNS: readonly {
  key: string;
  labelFr: string;
  cells: Readonly<Record<BenchmarkCriterionId, MatrixCell>>;
}[] = [
  {
    key: 'whatsapp',
    labelFr: 'WhatsApp',
    cells: {
      social: 'no',
      marketplace: 'no',
      mobile_money: 'no',
      messaging: 'yes',
      low_bandwidth: 'partial',
      africa_product: 'partial',
      open_engineering: 'no',
    },
  },
  {
    key: 'jumia',
    labelFr: 'Jumia',
    cells: {
      social: 'no',
      marketplace: 'yes',
      mobile_money: 'partial',
      messaging: 'no',
      low_bandwidth: 'no',
      africa_product: 'yes',
      open_engineering: 'no',
    },
  },
  {
    key: 'wechat',
    labelFr: 'WeChat',
    cells: {
      social: 'yes',
      marketplace: 'yes',
      mobile_money: 'yes',
      messaging: 'yes',
      low_bandwidth: 'no',
      africa_product: 'no',
      open_engineering: 'no',
    },
  },
] as const;
