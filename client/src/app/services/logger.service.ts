import { Injectable, isDevMode } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {

  /**
   * Logs debug messages to the console ONLY in development mode.
   * Completely suppressed in production to prevent PII leakage.
   */
  debug(message: string, ...optionalParams: any[]) {
    if (isDevMode()) {
      console.debug(`[DEBUG] ${message}`, ...optionalParams);
    }
  }

  /**
   * Logs standard information. Suppressed in production.
   */
  info(message: string, ...optionalParams: any[]) {
    if (isDevMode()) {
      console.info(`[INFO] ${message}`, ...optionalParams);
    }
  }

  /**
   * Logs warnings. Kept in production to monitor potential issues.
   */
  warn(message: string, ...optionalParams: any[]) {
    console.warn(`[WARN] ${message}`, ...optionalParams);
  }

  /**
   * Logs critical errors. Always printed and ideally sent to a remote monitoring service.
   */
  error(message: string, ...optionalParams: any[]) {
    console.error(`[ERROR] ${message}`, ...optionalParams);
    // TODO: In the future, hook this up to Sentry or Datadog
  }
}
