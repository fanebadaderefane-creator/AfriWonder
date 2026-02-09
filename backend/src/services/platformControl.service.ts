import prisma from '../config/database.js';

const KEYS = {
  MARKETPLACE_ENABLED: 'marketplace_enabled',
  PAYMENTS_ENABLED: 'payments_enabled',
  VIDEOS_ENABLED: 'videos_enabled',
  RIDE_ENABLED: 'ride_enabled',
  FOOD_ENABLED: 'food_enabled',
  HEALTH_ENABLED: 'health_enabled',
  INSURANCE_ENABLED: 'insurance_enabled',
  EVENTS_ENABLED: 'events_enabled',
  MAINTENANCE_MODE: 'maintenance_mode',
  EMERGENCY_MODE: 'emergency_mode',
} as const;

type Key = (typeof KEYS)[keyof typeof KEYS];

async function getValue(key: Key): Promise<boolean> {
  const row = await prisma.platformSettings.findUnique({
    where: { key },
  });
  if (!row || row.value == null) return true; // default enabled
  const v = row.value as unknown;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'object' && v !== null && 'enabled' in v) return (v as { enabled: boolean }).enabled;
  return true;
}

async function setValue(key: Key, value: boolean) {
  const payload = { key, value: value as unknown as object, updated_at: new Date() };
  const existing = await prisma.platformSettings.findUnique({ where: { key } });
  if (existing) {
    await prisma.platformSettings.update({ where: { key }, data: { value: payload.value, updated_at: payload.updated_at } });
  } else {
    await prisma.platformSettings.create({
      data: { id: `ps-${key}`, key: payload.key, value: payload.value, updated_at: payload.updated_at },
    });
  }
}

class PlatformControlService {
  async getKillSwitchState() {
    const [
      marketplace_enabled,
      payments_enabled,
      videos_enabled,
      ride_enabled,
      food_enabled,
      health_enabled,
      insurance_enabled,
      events_enabled,
      maintenance_mode,
      emergency_mode,
    ] = await Promise.all([
      getValue(KEYS.MARKETPLACE_ENABLED),
      getValue(KEYS.PAYMENTS_ENABLED),
      getValue(KEYS.VIDEOS_ENABLED),
      getValue(KEYS.RIDE_ENABLED),
      getValue(KEYS.FOOD_ENABLED),
      getValue(KEYS.HEALTH_ENABLED),
      getValue(KEYS.INSURANCE_ENABLED),
      getValue(KEYS.EVENTS_ENABLED),
      getValue(KEYS.MAINTENANCE_MODE),
      getValue(KEYS.EMERGENCY_MODE),
    ]);
    return {
      marketplace_enabled,
      payments_enabled,
      videos_enabled,
      ride_enabled,
      food_enabled,
      health_enabled,
      insurance_enabled,
      events_enabled,
      maintenance_mode,
      emergency_mode,
    };
  }

  async setMarketplaceEnabled(enabled: boolean) {
    await setValue(KEYS.MARKETPLACE_ENABLED, enabled);
    return this.getKillSwitchState();
  }

  async setPaymentsEnabled(enabled: boolean) {
    await setValue(KEYS.PAYMENTS_ENABLED, enabled);
    return this.getKillSwitchState();
  }

  async setVideosEnabled(enabled: boolean) {
    await setValue(KEYS.VIDEOS_ENABLED, enabled);
    return this.getKillSwitchState();
  }

  async setMaintenanceMode(enabled: boolean) {
    await setValue(KEYS.MAINTENANCE_MODE, enabled);
    return this.getKillSwitchState();
  }

  async setEmergencyMode(enabled: boolean) {
    await setValue(KEYS.EMERGENCY_MODE, enabled);
    return this.getKillSwitchState();
  }

  async setRideEnabled(enabled: boolean) {
    await setValue(KEYS.RIDE_ENABLED, enabled);
    return this.getKillSwitchState();
  }

  async setFoodEnabled(enabled: boolean) {
    await setValue(KEYS.FOOD_ENABLED, enabled);
    return this.getKillSwitchState();
  }

  async setHealthEnabled(enabled: boolean) {
    await setValue(KEYS.HEALTH_ENABLED, enabled);
    return this.getKillSwitchState();
  }

  async setInsuranceEnabled(enabled: boolean) {
    await setValue(KEYS.INSURANCE_ENABLED, enabled);
    return this.getKillSwitchState();
  }

  async setEventsEnabled(enabled: boolean) {
    await setValue(KEYS.EVENTS_ENABLED, enabled);
    return this.getKillSwitchState();
  }

  /** Vérifications pour les routes métier */
  async isMarketplaceEnabled(): Promise<boolean> {
    const state = await this.getKillSwitchState();
    if (state.emergency_mode || state.maintenance_mode) return false;
    return state.marketplace_enabled;
  }

  async isPaymentsEnabled(): Promise<boolean> {
    const state = await this.getKillSwitchState();
    if (state.emergency_mode || state.maintenance_mode) return false;
    return state.payments_enabled;
  }

  async isVideosEnabled(): Promise<boolean> {
    const state = await this.getKillSwitchState();
    if (state.emergency_mode || state.maintenance_mode) return false;
    return state.videos_enabled;
  }

  async isRideEnabled(): Promise<boolean> {
    const state = await this.getKillSwitchState();
    if (state.emergency_mode || state.maintenance_mode) return false;
    return (state as any).ride_enabled !== false;
  }

  async isFoodEnabled(): Promise<boolean> {
    const state = await this.getKillSwitchState();
    if (state.emergency_mode || state.maintenance_mode) return false;
    return (state as any).food_enabled !== false;
  }

  async isHealthEnabled(): Promise<boolean> {
    const state = await this.getKillSwitchState();
    if (state.emergency_mode || state.maintenance_mode) return false;
    return (state as any).health_enabled !== false;
  }

  async isInsuranceEnabled(): Promise<boolean> {
    const state = await this.getKillSwitchState();
    if (state.emergency_mode || state.maintenance_mode) return false;
    return (state as any).insurance_enabled !== false;
  }

  async isEventsEnabled(): Promise<boolean> {
    const state = await this.getKillSwitchState();
    if (state.emergency_mode || state.maintenance_mode) return false;
    return (state as any).events_enabled !== false;
  }
}

export default new PlatformControlService();
export { KEYS as PLATFORM_KEYS };
