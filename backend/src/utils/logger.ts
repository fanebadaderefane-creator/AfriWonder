/**
 * Logger centralisé pour le backend
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private shouldLog = process.env.NODE_ENV !== 'test';

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    const logData = {
      level: 'error' as LogLevel,
      message,
      timestamp: new Date().toISOString(),
      context,
      ...(error instanceof Error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    if (this.shouldLog) {
      console.error('[ERROR]', logData);
    }
    return logData;
  }

  warn(message: string, context?: Record<string, unknown>) {
    const logData = {
      level: 'warn' as LogLevel,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (this.shouldLog) {
      console.warn('[WARN]', logData);
    }
    return logData;
  }

  info(message: string, context?: Record<string, unknown>) {
    const logData = {
      level: 'info' as LogLevel,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (this.shouldLog) {
      console.log('[INFO]', logData);
    }
    return logData;
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (!this.isDevelopment || !this.shouldLog) return;

    const logData = {
      level: 'debug' as LogLevel,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    console.log('[DEBUG]', logData);
    return logData;
  }
}

export const logger = new Logger();
export default logger;

