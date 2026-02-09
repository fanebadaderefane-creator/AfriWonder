/**
 * Centralized logging service for AfriWonder
 * Replaces console.log/error/warn with a structured logging system
 */

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
  }

  /**
   * Log error with context
   */
  error(message, error = null, context = {}) {
    const logData = {
      level: LOG_LEVELS.ERROR,
      message,
      timestamp: new Date().toISOString(),
      context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    // Always log errors
    console.error('[ERROR]', logData);

    // In production, send to error tracking service (Sentry, etc.)
    if (this.isProduction && window.Sentry) {
      window.Sentry.captureException(error || new Error(message), {
        extra: context,
      });
    }

    return logData;
  }

  /**
   * Log warning
   */
  warn(message, context = {}) {
    const logData = {
      level: LOG_LEVELS.WARN,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (this.isDevelopment || this.isProduction) {
      console.warn('[WARN]', logData);
    }

    return logData;
  }

  /**
   * Log info (only in development)
   */
  info(message, context = {}) {
    if (!this.isDevelopment) return;

    const logData = {
      level: LOG_LEVELS.INFO,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    console.log('[INFO]', logData);
    return logData;
  }

  /**
   * Log debug (only in development)
   */
  debug(message, context = {}) {
    if (!this.isDevelopment) return;

    const logData = {
      level: LOG_LEVELS.DEBUG,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    console.log('[DEBUG]', logData);
    return logData;
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;

