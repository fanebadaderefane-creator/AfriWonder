import prisma from '../config/database.js';

export type KycRequiredAction = 'payment' | 'ride' | 'appointment' | 'insurance_claim' | 'withdrawal';

const ACTION_VERIFICATION: Record<KycRequiredAction, 'required' | 'optional'> = {
  payment: 'required',
  ride: 'required',
  appointment: 'required',
  insurance_claim: 'required',
  withdrawal: 'required',
};

export async function isKycApproved(userId: string): Promise<boolean> {
  const v = await prisma.userVerification.findUnique({
    where: { user_id: userId },
    select: { status: true },
  });
  return v?.status === 'approved';
}

export async function requireKycFor(userId: string, action: KycRequiredAction): Promise<{ allowed: boolean; message?: string }> {
  if (ACTION_VERIFICATION[action] !== 'required') return { allowed: true };
  const approved = await isKycApproved(userId);
  if (approved) return { allowed: true };
  return {
    allowed: false,
    message: 'Vérification d\'identité (KYC) requise pour cette action. Soumettez vos documents dans Paramètres.',
  };
}
