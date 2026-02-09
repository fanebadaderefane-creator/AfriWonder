import prisma from '../config/database.js';

const DEFAULT_CURRENCY = 'XOF';

/**
 * Taux de conversion (vers XOF = 1 unité de from_currency = rate XOF)
 * Ex: EUR -> XOF: 1 EUR = 655.957 XOF
 */
class ExchangeRateService {
  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1;
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    const row = await prisma.exchangeRate.findUnique({
      where: {
        from_currency_to_currency: { from_currency: from, to_currency: to },
      },
    });
    if (row) return row.rate;
    const inverse = await prisma.exchangeRate.findUnique({
      where: {
        from_currency_to_currency: { from_currency: to, to_currency: from },
      },
    });
    if (inverse) return 1 / inverse.rate;
    if ((from === 'EUR' && to === 'XOF') || (from === 'XOF' && to === 'EUR')) {
      const eurToXof = 655.957;
      return from === 'EUR' ? eurToXof : 1 / eurToXof;
    }
    return 1;
  }

  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getRate(fromCurrency, toCurrency);
    return Math.round(amount * rate * 100) / 100;
  }

  async setRate(fromCurrency: string, toCurrency: string, rate: number) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    return prisma.exchangeRate.upsert({
      where: {
        from_currency_to_currency: { from_currency: from, to_currency: to },
      },
      create: { from_currency: from, to_currency: to, rate },
      update: { rate },
    });
  }

  async getAllRates() {
    let rates = await prisma.exchangeRate.findMany({ orderBy: [{ from_currency: 'asc' }, { to_currency: 'asc' }] });
    if (rates.length === 0) {
      await this.setRate('EUR', 'XOF', 655.957);
      rates = await prisma.exchangeRate.findMany({ orderBy: [{ from_currency: 'asc' }, { to_currency: 'asc' }] });
    }
    return rates;
  }

  /** Convertir un prix produit vers la devise cible (ex: affichage en EUR) */
  async convertProductPrice(price: number, productCurrency: string, targetCurrency: string): Promise<number> {
    return this.convert(price, productCurrency || DEFAULT_CURRENCY, targetCurrency || DEFAULT_CURRENCY);
  }
}

export default new ExchangeRateService();
