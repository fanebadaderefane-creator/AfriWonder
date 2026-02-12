import prisma from '../config/database.js';
import { COMMISSION_VERTICALS } from '../config/commissions.js';

const SETTINGS_KEY = 'commission_overrides';

type AnyObj = Record<string, any>;

function isPlainObject(value: unknown): value is AnyObj {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base: AnyObj, patch: AnyObj): AnyObj {
  const out: AnyObj = { ...base };
  for (const [key, value] of Object.entries(patch || {})) {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

class CommissionSettingsService {
  private overrides: AnyObj = {};
  private loaded = false;

  getOverrides() {
    return this.overrides;
  }

  getEffectiveConfig() {
    return deepMerge(COMMISSION_VERTICALS as AnyObj, this.overrides);
  }

  async loadFromDb() {
    const row = await prisma.platformSettings.findUnique({ where: { key: SETTINGS_KEY } });
    const value = row?.value;
    this.overrides = isPlainObject(value) ? value : {};
    this.loaded = true;
    return this.getEffectiveConfig();
  }

  async ensureLoaded() {
    if (!this.loaded) {
      await this.loadFromDb();
    }
  }

  async updateOverrides(nextOverrides: AnyObj, merge: boolean = true) {
    await this.ensureLoaded();
    this.overrides = merge ? deepMerge(this.overrides, nextOverrides || {}) : (isPlainObject(nextOverrides) ? nextOverrides : {});

    const existing = await prisma.platformSettings.findUnique({ where: { key: SETTINGS_KEY } });
    if (existing) {
      await prisma.platformSettings.update({
        where: { key: SETTINGS_KEY },
        data: { value: this.overrides, updated_at: new Date() },
      });
    } else {
      await prisma.platformSettings.create({
        data: {
          id: `ps-${SETTINGS_KEY}`,
          key: SETTINGS_KEY,
          value: this.overrides,
          updated_at: new Date(),
        },
      });
    }

    return this.getEffectiveConfig();
  }

  async resetOverrides() {
    this.overrides = {};
    const existing = await prisma.platformSettings.findUnique({ where: { key: SETTINGS_KEY } });
    if (existing) {
      await prisma.platformSettings.update({
        where: { key: SETTINGS_KEY },
        data: { value: {}, updated_at: new Date() },
      });
    }
    return this.getEffectiveConfig();
  }
}

const commissionSettingsService = new CommissionSettingsService();
export default commissionSettingsService;
