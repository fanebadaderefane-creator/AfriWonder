import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CSVService } from './csvService';

describe('CSVService', () => {
  describe('parseCSV', () => {
    it('resolves with data when no errors', async () => {
      const file = new File(['name,age\nAlice,30\nBob,25'], 'test.csv', { type: 'text/csv' });
      const result = await CSVService.parseCSV(file);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({ name: 'Alice', age: 30 });
      expect(result[1]).toMatchObject({ name: 'Bob', age: 25 });
    });
    it('rejects on parse errors', async () => {
      const file = new File(['invalid'], 'test.csv', { type: 'text/csv' });
      await expect(CSVService.parseCSV(file)).rejects.toThrow(/CSV parsing error/);
    });
    it('rejects when Papa calls error callback', async () => {
      const Papa = await import('papaparse');
      const origParse = Papa.default.parse;
      Papa.default.parse = (_input, config) => {
        if (config?.error) config.error(new Error('Papa parse error'));
      };
      const file = new File(['a,b'], 'x.csv', { type: 'text/csv' });
      await expect(CSVService.parseCSV(file)).rejects.toThrow('Papa parse error');
      Papa.default.parse = origParse;
    });
  });

  describe('validateCSV', () => {
    it('returns invalid when rows empty', () => {
      const r = CSVService.validateCSV([], ['name']);
      expect(r.isValid).toBe(false);
      expect(r.errors).toContain('CSV file is empty');
    });
    it('returns invalid when rows null', () => {
      const r = CSVService.validateCSV(null, []);
      expect(r.isValid).toBe(false);
    });
    it('returns invalid when required field missing', () => {
      const r = CSVService.validateCSV([{ age: 30 }], ['name']);
      expect(r.isValid).toBe(false);
      expect(r.errors).toContain('Missing required field: name');
    });
    it('returns valid when all required fields present', () => {
      const r = CSVService.validateCSV([{ name: 'A', age: 1 }], ['name', 'age']);
      expect(r.isValid).toBe(true);
      expect(r.errors).toHaveLength(0);
    });
  });

  describe('generateCSV', () => {
    it('generates csv from data', () => {
      const data = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
      const csv = CSVService.generateCSV(data);
      expect(csv).toContain('1');
      expect(csv).toContain('2');
      expect(csv).toContain('3');
      expect(csv).toContain('4');
    });
    it('uses headers when provided', () => {
      const data = [{ x: 1, y: 2 }];
      const csv = CSVService.generateCSV(data, ['x', 'y']);
      expect(csv).toContain('x');
      expect(csv).toContain('y');
    });
  });

  describe('downloadCSV', () => {
    it('creates link and triggers download', () => {
      const createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.createObjectURL = createObjectURL;
      const origCreateElement = document.createElement.bind(document);
      const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'a') {
          el.click = vi.fn();
        }
        return el;
      });
      CSVService.downloadCSV([{ a: 1 }], 'export.csv');
      expect(createObjectURL).toHaveBeenCalled();
      const link = createElement.mock.results.find((r) => r.value?.tagName === 'A')?.value;
      expect(link?.getAttribute('download')).toBe('export.csv');
      expect(link?.getAttribute('href')).toBe('blob:mock-url');
      createElement.mockRestore();
    });
  });
});
