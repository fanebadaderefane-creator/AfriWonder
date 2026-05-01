/**
 * Client Téléconsultation — flow complet patient → médecin.
 *
 * Utilise les routes backend existantes :
 *  - GET  /api/doctors                 → liste médecins filtrables
 *  - GET  /api/doctors/:id             → détail médecin
 *  - POST /api/appointments            → créer un RDV
 *  - GET  /api/appointments/:id        → détail RDV
 *  - PATCH /api/appointments/:id       → annuler / changer
 *  - POST /api/calls/direct            → démarrer un appel vidéo Agora
 */
import apiClient from './client';

export interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  specialty: string;
  bio?: string | null;
  profile_image?: string | null;
  city?: string | null;
  country?: string | null;
  languages?: string[] | null;
  consultation_fee_fcfa?: number | null;
  average_rating?: number | null;
  total_consultations?: number | null;
  is_verified?: boolean;
  is_available_now?: boolean;
  next_availability?: string | null;
}

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  scheduled_at: string;
  duration_min: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  mode: 'in_person' | 'video' | 'audio' | 'chat';
  fee_fcfa?: number | null;
  notes?: string | null;
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  prescription_url?: string | null;
  diagnosis?: string | null;
  doctor?: { id: string; full_name: string; specialty: string; profile_image?: string | null };
  created_at: string;
}

export const teleconsultationApi = {
  async listDoctors(params?: { specialty?: string; city?: string; search?: string; available_now?: boolean }): Promise<Doctor[]> {
    const { data } = await apiClient.get('/doctors', { params });
    return data?.data ?? [];
  },

  async getDoctor(id: string): Promise<Doctor | null> {
    try {
      const { data } = await apiClient.get(`/doctors/${encodeURIComponent(id)}`);
      return data?.data ?? null;
    } catch {
      return null;
    }
  },

  async listMyAppointments(): Promise<Appointment[]> {
    const { data } = await apiClient.get('/appointments');
    return data?.data ?? [];
  },

  async getAppointment(id: string): Promise<Appointment | null> {
    try {
      const { data } = await apiClient.get(`/appointments/${encodeURIComponent(id)}`);
      return data?.data ?? null;
    } catch {
      return null;
    }
  },

  async createAppointment(payload: {
    doctor_id: string;
    scheduled_at: string;
    duration_min?: number;
    mode: 'video' | 'audio' | 'chat' | 'in_person';
    notes?: string;
  }): Promise<Appointment> {
    const { data } = await apiClient.post('/appointments', payload);
    return data?.data;
  },

  async cancelAppointment(id: string): Promise<void> {
    await apiClient.patch(`/appointments/${encodeURIComponent(id)}`, { status: 'cancelled' });
  },

  /**
   * Démarre un appel vidéo / audio avec le médecin via la messagerie directe.
   * Backend : /api/calls/direct crée une session Agora.
   */
  async startCall(doctorUserId: string, mode: 'video' | 'audio'): Promise<{ channel: string; token: string; room_id?: string } | null> {
    try {
      const { data } = await apiClient.post('/calls/direct/start', {
        peer_user_id: doctorUserId,
        kind: mode,
      });
      return data?.data ?? null;
    } catch {
      return null;
    }
  },
};

export default teleconsultationApi;
