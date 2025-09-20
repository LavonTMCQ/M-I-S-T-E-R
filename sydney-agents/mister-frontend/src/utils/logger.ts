/**
 * Logger utility for consistent logging across the application
 */

export interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, error?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export function createLogger(name: string): Logger {
  const prefix = `[${name}]`;
  
  return {
    info(message: string, meta?: any) {
      console.log(`${prefix} INFO:`, message, meta ? JSON.stringify(meta, null, 2) : '');
    },
    
    error(message: string, error?: any) {
      console.error(`${prefix} ERROR:`, message, error);
    },
    
    warn(message: string, meta?: any) {
      console.warn(`${prefix} WARN:`, message, meta ? JSON.stringify(meta, null, 2) : '');
    },
    
    debug(message: string, meta?: any) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`${prefix} DEBUG:`, message, meta ? JSON.stringify(meta, null, 2) : '');
      }
    }
  };
}