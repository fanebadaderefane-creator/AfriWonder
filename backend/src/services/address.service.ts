import prisma from '../config/database.js';

export async function listByUser(userId: string) {
  return prisma.address.findMany({
    where: { user_id: userId },
    orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
  });
}

export async function create(userId: string, data: {
  street: string;
  city: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  type?: string;
  is_default?: boolean;
}) {
  if (data.is_default) {
    await prisma.address.updateMany({
      where: { user_id: userId },
      data: { is_default: false },
    });
  }
  return prisma.address.create({
    data: {
      user_id: userId,
      street: data.street,
      city: data.city,
      country: data.country || 'Senegal',
      postal_code: data.postal_code || null,
      phone: data.phone || null,
      type: data.type || 'shipping',
      is_default: data.is_default ?? false,
    },
  });
}

export async function update(addressId: string, userId: string, data: Partial<{
  street: string;
  city: string;
  country: string;
  postal_code: string;
  phone: string;
  type: string;
  is_default: boolean;
}>) {
  const addr = await prisma.address.findFirst({
    where: { id: addressId, user_id: userId },
  });
  if (!addr) {
    const err: any = new Error('Adresse non trouvee');
    err.statusCode = 404;
    throw err;
  }
  if (data.is_default) {
    await prisma.address.updateMany({
      where: { user_id: userId },
      data: { is_default: false },
    });
  }
  const updateData: Record<string, unknown> = {};
  if (data.street != null) updateData.street = data.street;
  if (data.city != null) updateData.city = data.city;
  if (data.country != null) updateData.country = data.country;
  if (data.postal_code != null) updateData.postal_code = data.postal_code;
  if (data.phone != null) updateData.phone = data.phone;
  if (data.type != null) updateData.type = data.type;
  if (data.is_default != null) updateData.is_default = data.is_default;
  return prisma.address.update({
    where: { id: addressId },
    data: updateData,
  });
}

export async function remove(addressId: string, userId: string) {
  const addr = await prisma.address.findFirst({
    where: { id: addressId, user_id: userId },
  });
  if (!addr) {
    const err: any = new Error('Adresse non trouvee');
    err.statusCode = 404;
    throw err;
  }
  await prisma.address.delete({ where: { id: addressId } });
  return { deleted: true };
}
