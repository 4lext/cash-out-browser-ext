const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;
type LogContext = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

export class Logger {
  private level: number;

  constructor() {
    // Default to INFO level, DEBUG in development
    this.level = process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    // Don't log in test environment unless debug is enabled
    if (process.env.NODE_ENV === 'test') {
      return false;
    }
    return LOG_LEVELS[level] >= this.level;
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context } = entry;
    const base = `[${timestamp}] ${level}: ${message}`;

    if (!context || Object.keys(context).length === 0) {
      return base;
    }

    if (process.env.NODE_ENV === 'production') {
      return `${base} ${JSON.stringify(context)}`;
    }

    return `${base}\n${JSON.stringify(context, null, 2)}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };

    const formattedLog = this.formatLog(entry);

    switch (level) {
      case 'ERROR':
        console.error(formattedLog);
        break;
      case 'WARN':
        console.warn(formattedLog);
        break;
      default:
        console.log(formattedLog);
    }
  }

  error(message: string, context?: LogContext): void {
    this.log('ERROR', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('INFO', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('DEBUG', message, context);
  }

  success(message: string, context?: LogContext): void {
    // Log success as info level with a success prefix
    this.log('INFO', `✅ ${message}`, context);
  }

  setLevel(level: LogLevel): void {
    this.level = LOG_LEVELS[level];
  }

  time(label: string): void {
    if (this.shouldLog('DEBUG')) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('DEBUG')) {
      console.timeEnd(label);
    }
  }
}

export const log = new Logger();
