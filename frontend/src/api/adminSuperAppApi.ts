/**
 * Client API admin super-app — lit les KPIs et agit sur les nouveaux modules.
 * Backend : `/api/admin/super-app/*`.
 */
import apiClient from './client';

export type SystemAuditPayload = {
  e2eTests: boolean;
  microservicesReady: boolean;
  cdnEnabled: boolean;
  scalableWebSocket: boolean;
  realMobileMoney: boolean;
  details: Record<string, string>;
  environment: string;
  productionReady: boolean;
  deliveryPlan?: { id: string; priority: number; title: string; status: 'ok' | 'partial' | 'todo'; proof: string }[];
};

export type SystemAutoFixPayload = {
  audit: SystemAuditPayload;
  actions: { id: string; status: 'partial' | 'done' | 'applied'; message: string }[];
  appliedArtifacts?: string[];
  summary?: string;
};

export interface AdminSuperAppKpis {
  tontines: { active: number; completed: number; total_members: number };
  travel: { bus_bookings_total: number; bus_bookings_paid: number; hotel_bookings_total: number };
  bills: { paid: number; pending: number };
  savings: { active_plans: number; total_balance_fcfa: number };
  cards: { active: number };
  live_commerce: { pinned_products: number };
  /** Présent si l’API expose les compteurs (versions récentes). */
  crowdfunding?: { pending: number; active: number; suspended: number };
}

export const adminSuperAppApi = {
  async kpis(): Promise<AdminSuperAppKpis | null> {
    try {
      const { data } = await apiClient.get('/admin/super-app/kpis');
      return data?.data ?? null;
    } catch { return null; }
  },

  // Tontines
  async listTontines(status?: string): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/tontines', { params: { status } });
    return data?.data ?? [];
  },
  async forceCancelTontine(id: string, reason?: string): Promise<void> {
    await apiClient.post(`/admin/super-app/tontines/${id}/force-cancel`, { reason });
  },

  // Bus
  async listBusCompanies(): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/bus/companies');
    return data?.data ?? [];
  },
  async createBusCompany(payload: any): Promise<any> {
    const { data } = await apiClient.post('/admin/super-app/bus/companies', payload);
    return data?.data;
  },
  async updateBusCompany(id: string, payload: any): Promise<any> {
    const { data } = await apiClient.patch(`/admin/super-app/bus/companies/${id}`, payload);
    return data?.data;
  },
  async createBusRoute(payload: any): Promise<any> {
    const { data } = await apiClient.post('/admin/super-app/bus/routes', payload);
    return data?.data;
  },
  async listBusBookings(status?: string): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/bus/bookings', { params: { status } });
    return data?.data ?? [];
  },

  // Hotels
  async listHotels(): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/hotels');
    return data?.data ?? [];
  },
  async createHotel(payload: any): Promise<any> {
    const { data } = await apiClient.post('/admin/super-app/hotels', payload);
    return data?.data;
  },
  async updateHotel(id: string, payload: any): Promise<any> {
    const { data } = await apiClient.patch(`/admin/super-app/hotels/${id}`, payload);
    return data?.data;
  },
  async listHotelBookings(): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/hotels/bookings');
    return data?.data ?? [];
  },

  // Bill providers
  async listBillProviders(): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/bill-providers');
    return data?.data ?? [];
  },
  async createBillProvider(payload: any): Promise<any> {
    const { data } = await apiClient.post('/admin/super-app/bill-providers', payload);
    return data?.data;
  },
  async updateBillProvider(id: string, payload: any): Promise<any> {
    const { data } = await apiClient.patch(`/admin/super-app/bill-providers/${id}`, payload);
    return data?.data;
  },
  async listBillPayments(status?: string): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/bill-payments', { params: { status } });
    return data?.data ?? [];
  },

  // Savings / Cards
  async listSavingsPlans(status?: string): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/savings', { params: { status } });
    return data?.data ?? [];
  },
  async listVirtualCards(status?: string): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/virtual-cards', { params: { status } });
    return data?.data ?? [];
  },
  async forceBlockCard(id: string, reason?: string): Promise<void> {
    await apiClient.post(`/admin/super-app/virtual-cards/${id}/force-block`, { reason });
  },

  // Crowdfunding (modération)
  async listCrowdfundingCampaigns(status?: string): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/crowdfunding', { params: { status } });
    return data?.data ?? [];
  },
  async suspendCrowdfundingCampaign(
    id: string,
    input?: { reason?: string; fraudFlag?: boolean },
  ): Promise<void> {
    await apiClient.post(`/admin/super-app/crowdfunding/${encodeURIComponent(id)}/suspend`, input ?? {});
  },

  // Live commerce
  async topLiveCommerce(): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/live-commerce/top');
    return data?.data ?? [];
  },

  // Doctors
  async pendingDoctors(): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/doctors/pending');
    return data?.data ?? [];
  },
  async approveDoctorKyc(providerId: string, note?: string): Promise<void> {
    await apiClient.post(`/admin/super-app/doctors/${providerId}/approve`, { note });
  },

  // Rides
  async listRides(status?: string): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/rides', { params: { status } });
    return data?.data ?? [];
  },
  async listDriversForAdmin(): Promise<any[]> {
    const { data } = await apiClient.get('/admin/super-app/drivers');
    return data?.data ?? [];
  },
  async assignDriverToRide(rideId: string, driverUserId: string): Promise<any> {
    const { data } = await apiClient.post(`/admin/super-app/rides/${rideId}/assign-driver`, {
      driver_user_id: driverUserId,
    });
    return data?.data;
  },

  // Hôtel — fiche + chambres
  async getHotelDetail(hotelId: string): Promise<any> {
    const { data } = await apiClient.get(`/admin/super-app/hotels/${hotelId}/detail`);
    return data?.data;
  },
  async createHotelRoom(hotelId: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await apiClient.post(`/admin/super-app/hotels/${hotelId}/rooms`, payload);
    return data?.data;
  },
  async updateHotelRoom(roomId: string, payload: Record<string, unknown>): Promise<any> {
    const { data } = await apiClient.patch(`/admin/super-app/hotels/rooms/${roomId}`, payload);
    return data?.data;
  },

  async systemAudit(): Promise<SystemAuditPayload | null> {
    try {
      const { data } = await apiClient.get('/admin/super-app/system-audit');
      return (data?.data ?? null) as SystemAuditPayload | null;
    } catch {
      return null;
    }
  },

  async systemAuditAutoFix(): Promise<SystemAutoFixPayload | null> {
    try {
      const { data } = await apiClient.post('/admin/super-app/system-audit/auto-fix', {});
      return (data?.data ?? null) as SystemAutoFixPayload | null;
    } catch {
      return null;
    }
  },
};

export default adminSuperAppApi;
