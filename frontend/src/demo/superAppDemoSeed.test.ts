import { describe, expect, it } from 'vitest';
import {
  AFW_DEMO_PREFIX,
  DEMO_RESTAURANTS,
  filterDemoDrivers,
  filterDemoJobs,
  filterDemoNews,
  getDemoDoctorById,
  getDemoEventById,
  getDemoJobById,
  getDemoMenuForRestaurant,
  getDemoNewsArticleById,
  getDemoPropertyById,
  getDemoProviderById,
  getDemoProvidersForCategory,
  getDemoRideById,
  getDemoTrackedRidePayload,
  getDemoRestaurantById,
  getDemoTeleDoctorById,
  getDemoMarketProductDetail,
  filterDemoCourses,
  filterDemoMiniApps,
  getDemoCourseDetailView,
  isAfriWonderDemoId,
} from './superAppDemoSeed';

describe('superAppDemoSeed', () => {
  it('isAfriWonderDemoId détecte le préfixe', () => {
    expect(isAfriWonderDemoId(`${AFW_DEMO_PREFIX}x`)).toBe(true);
    expect(isAfriWonderDemoId('real-id')).toBe(false);
    expect(isAfriWonderDemoId('')).toBe(false);
    expect(isAfriWonderDemoId(null)).toBe(false);
  });

  it('getters restaurant / menu', () => {
    const id = DEMO_RESTAURANTS[0]!.id;
    expect(getDemoRestaurantById(id)?.name).toBeTruthy();
    expect(getDemoRestaurantById('nope')).toBeNull();
    expect(getDemoMenuForRestaurant(id).length).toBeGreaterThan(0);
  });

  it('getters médecin / téléconsultation', () => {
    const d = getDemoDoctorById('afw-demo-dr-aminata');
    expect(d?.specialty).toBe('Généraliste');
    const tele = getDemoTeleDoctorById('afw-demo-dr-aminata');
    expect(tele?.consultation_fee_fcfa).toBeGreaterThan(0);
    expect(getDemoTeleDoctorById('x')).toBeNull();
  });

  it('événement / bien / actu', () => {
    expect(getDemoEventById('afw-demo-event-festival')?.city).toBe('Bamako');
    expect(getDemoPropertyById('afw-demo-prop-villa')?.listing_type).toBe('sale');
    expect(filterDemoNews('sports').length).toBeGreaterThan(0);
    expect(filterDemoNews('economie').length).toBeGreaterThan(0);
    expect(getDemoNewsArticleById('afw-demo-news-tech')?.category).toBe('tech');
  });

  it('transport / emplois / prestataires / courses', () => {
    expect(filterDemoDrivers('taxi').length).toBeGreaterThan(0);
    expect(filterDemoJobs('react').length).toBeGreaterThan(0);
    expect(getDemoJobById('afw-demo-job-mobile')?.city).toBe('Bamako');
    expect(getDemoProvidersForCategory('childcare').length).toBeGreaterThan(0);
    expect(getDemoProviderById('afw-demo-nanny-aminata')?.city).toBe('Bamako');
    expect(getDemoRideById('afw-demo-ride-1')?.status).toBe('completed');
    expect(getDemoTrackedRidePayload('afw-demo-ride-1')?.currency).toBe('FCFA');
    expect(getDemoTrackedRidePayload('nope')).toBeNull();
  });

  it('market / formations / mini-apps démo', () => {
    expect(getDemoMarketProductDetail('afw-demo-prod-bogolan')?.price).toBeGreaterThan(0);
    expect(getDemoMarketProductDetail('x')).toBeNull();
    expect(filterDemoCourses('tous').length).toBeGreaterThanOrEqual(3);
    expect(filterDemoCourses('tech').every((c) => c.category === 'tech')).toBe(true);
    expect(getDemoCourseDetailView('afw-demo-course-rn')?.lessons?.length).toBeGreaterThan(0);
    expect(filterDemoMiniApps('Tous', '').length).toBeGreaterThan(0);
    expect(filterDemoMiniApps('finance', 'budget').length).toBeGreaterThan(0);
  });
});
