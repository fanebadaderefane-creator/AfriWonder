/**
 * CSV Service wrapper for frontend
 * Uses papaparse for CSV parsing
 */
import Papa from 'papaparse';

export const CSVService = {
  /**
   * Parse CSV file and return structured data
   */
  parseCSV(file, options = {}) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        ...options,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  },

  /**
   * Validate CSV data structure
   */
  validateCSV(rows, requiredFields = []) {
    if (!rows || rows.length === 0) {
      return {
        isValid: false,
        errors: ['CSV file is empty'],
      };
    }

    const errors = [];
    const firstRow = rows[0];

    // Check required fields
    for (const field of requiredFields) {
      if (!(field in firstRow)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Generate CSV from data
   */
  generateCSV(data, headers = null) {
    const csv = Papa.unparse(data, {
      header: headers !== null,
      columns: headers,
    });
    return csv;
  },

  /**
   * Download CSV file
   */
  downloadCSV(data, filename = 'export.csv', headers = null) {
    const csv = this.generateCSV(data, headers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

