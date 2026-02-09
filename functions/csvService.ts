import Papa from "papaparse";

/**
 * CSV Service - Handles parsing and generation of CSV files
 */
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
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  },

  /**
   * Parse CSV from text string
   */
  parseCSVText(text, options = {}) {
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
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
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  },

  /**
   * Convert data array to CSV string
   */
  generateCSV(data, headers = null) {
    try {
      return Papa.unparse(data, {
        header: true,
        columns: headers
      });
    } catch (error) {
      throw new Error(`CSV generation failed: ${error.message}`);
    }
  },

  /**
   * Download CSV file
   */
  downloadCSV(data, filename = "export.csv", headers = null) {
    try {
      const csv = this.generateCSV(data, headers);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      throw new Error(`CSV download failed: ${error.message}`);
    }
  },

  /**
   * Validate CSV data against schema
   */
  validateCSV(data, requiredFields = []) {
    const errors = [];
    const warnings = [];

    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field] || row[field].toString().trim() === "") {
          errors.push(`Row ${index + 1}: Missing required field "${field}"`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      rowCount: data.length
    };
  }
};