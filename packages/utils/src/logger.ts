/**
 * AI 相关的日志工具函数
 */

export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
}

class Logger {
  private config: LogConfig;

  constructor(config: LogConfig = { level: 'info' }) {
    this.config = config;
  }

  private getPrefix(): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    return `${timestamp} ${prefix}`;
  }

  debug(...args: any[]): void {
    if (this.config.level === 'debug') {
      console.debug(`${this.getPrefix()} [DEBUG]`, ...args);
    }
  }

  info(...args: any[]): void {
    if (['debug', 'info'].includes(this.config.level)) {
      console.info(`${this.getPrefix()} [INFO]`, ...args);
    }
  }

  warn(...args: any[]): void {
    if (['debug', 'info', 'warn'].includes(this.config.level)) {
      console.warn(`${this.getPrefix()} [WARN]`, ...args);
    }
  }

  error(...args: any[]): void {
    console.error(`${this.getPrefix()} [ERROR]`, ...args);
  }
}

export function createLogger(config?: LogConfig): Logger {
  return new Logger(config);
}
