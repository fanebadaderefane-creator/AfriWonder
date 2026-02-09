/**
 * Service Facture — génération PDF et enregistrement OrderInvoice
 */
import { createRequire } from 'module';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

const requireModule = createRequire(import.meta.url);
const PDFDocument = requireModule('pdfkit');

const INVOICE_PREFIX = 'AC-INV-';

/** Génère un numéro de facture unique (ex: AC-INV-2026-000001) */
async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${INVOICE_PREFIX}${year}-`;
  const last = await prisma.orderInvoice.findFirst({
    where: { invoice_number: { startsWith: prefix } },
    orderBy: { invoice_number: 'desc' },
    select: { invoice_number: true },
  });
  const nextNum = last
    ? parseInt(last.invoice_number.replace(prefix, ''), 10) + 1
    : 1;
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

/** Crée ou récupère la facture pour une commande (après paiement) */
export async function getOrCreateInvoice(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              seller_id: true,
            },
          },
        },
      },
      user: { select: { full_name: true, username: true } },
      invoice: true,
    },
  });

  if (!order) throw new Error('Commande non trouvée');
  if (order.invoice) return order.invoice;

  const invoiceNumber = await nextInvoiceNumber();
  const subtotal = order.subtotal_amount ?? 0;
  const tax = order.tax_amount ?? 0;
  const total = order.total_amount ?? 0;
  const vatRate = order.tax_amount && order.subtotal_amount
    ? (order.tax_amount / order.subtotal_amount) * 100
    : null;

  const invoice = await prisma.orderInvoice.create({
    data: {
      order_id: orderId,
      invoice_number: invoiceNumber,
      subtotal,
      tax,
      total,
      currency: order.currency ?? 'XOF',
      vat_rate: vatRate ?? undefined,
      vat_amount: tax || undefined,
      tax_id: undefined, // À remplir par le vendeur (KYC)
    },
  });

  logger.info('Facture créée', { orderId, invoice_number: invoiceNumber });
  return invoice;
}

/** Génère le PDF de la facture et retourne un Buffer */
export async function generateInvoicePdf(orderId: string, userId: string): Promise<Buffer> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
      user: { select: { full_name: true, username: true } },
      invoice: true,
    },
  });

  if (!order) throw new Error('Commande non trouvée');
  if (order.user_id !== userId) throw new Error('Non autorisé');

  let inv = order.invoice;
  if (!inv) inv = await getOrCreateInvoice(orderId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const currency = order.currency || 'XOF';
    const fmt = (n: number) => `${Number(n).toLocaleString('fr-FR')} ${currency}`;

    doc.fontSize(20).text('Facture', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10)
      .text(`N° ${inv.invoice_number}`, { align: 'center' })
      .text(`Commande #${orderId.slice(0, 8)}`, { align: 'center' })
      .text(`Date: ${new Date(order.created_at).toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).text('Client', { continued: false });
    doc.font('Helvetica').fontSize(10)
      .text(order.user?.full_name || order.user?.username || 'Client')
      .text(order.shipping_address || '-');
    doc.moveDown(2);

    doc.fontSize(11).text('Détail de la commande', { continued: false });
    doc.moveDown(0.5);
    let y = doc.y;
    doc.fontSize(9);
    for (const item of order.items) {
      const name = (item.product_snapshot as any)?.name || item.product?.name || 'Article';
      const qty = item.quantity;
      const unitPrice = item.unit_price ?? 0;
      const lineTotal = qty * unitPrice;
      doc.text(`${name} x ${qty}`, 50, y)
        .text(fmt(unitPrice), 300, y)
        .text(fmt(lineTotal), 400, y);
      y += 20;
    }
    doc.moveDown(2);

    doc.text(`Sous-total: ${fmt(order.subtotal_amount ?? 0)}`, { align: 'right' });
    if ((order.shipping_amount ?? 0) > 0) doc.text(`Livraison: ${fmt(order.shipping_amount!)}`, { align: 'right' });
    if ((order.tax_amount ?? 0) > 0) doc.text(`TVA/Taxes: ${fmt(order.tax_amount!)}`, { align: 'right' });
    doc.fontSize(11).text(`Total: ${fmt(order.total_amount ?? 0)}`, { align: 'right' });
    doc.moveDown(2);

    doc.fontSize(8).fillColor('gray')
      .text('AfriWonder — Facture générée automatiquement. Merci pour votre confiance.', 50, doc.page.height - 50);

    doc.end();
  });
}

export default {
  getOrCreateInvoice,
  generateInvoicePdf,
  nextInvoiceNumber,
};
