/**
 * Logger centralisé pour le backend — CDC Observabilité (logs structurés).
 * En production ou LOG_FORMAT=json : une ligne JSON par log (ingestion ELK, Datadog, etc.).
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_FORMAT_JSON = process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';

function writeOut(level: string, logData: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'test') return;
  const line = LOG_FORMAT_JSON ? JSON.stringify(logData) : `[${level}] ${JSON.stringify(logData)}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private shouldLog = process.env.NODE_ENV !== 'test';

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    const logData: Record<string, unknown> = {
      level: 'error' as LogLevel,
      message,
      timestamp: new Date().toISOString(),
      ...(context && Object.keys(context).length > 0 && { context }),
      ...(error instanceof Error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    if (this.shouldLog) writeOut('ERROR', logData);
    return logData;
  }

  warn(message: string, context?: Record<string, unknown>) {
    const logData: Record<string, unknown> = {
      level: 'warn' as LogLevel,
      message,
      timestamp: new Date().toISOString(),
      ...(context && Object.keys(context).length > 0 && { context }),
    };

    if (this.shouldLog) writeOut('WARN', logData);
    return logData;
  }

  info(message: string, context?: Record<string, unknown>) {
    const logData: Record<string, unknown> = {
      level: 'info' as LogLevel,
      message,
      timestamp: new Date().toISOString(),
      ...(context && Object.keys(context).length > 0 && { context }),
    };

    if (this.shouldLog) writeOut('INFO', logData);
    return logData;
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (!this.isDevelopment || !this.shouldLog) return {} as Record<string, unknown>;

    const logData: Record<string, unknown> = {
      level: 'debug' as LogLevel,
      message,
      timestamp: new Date().toISOString(),
      ...(context && Object.keys(context).length > 0 && { context }),
    };

    writeOut('DEBUG', logData);
    return logData;
  }
}

export const logger = new Logger();
export default logger;

