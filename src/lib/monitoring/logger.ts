import { sanitizeAuditMetadata } from "@/lib/audit/logger";

/**
 * ==============================================================================
 * BloodLink – Structured Server-Side Logger & Monitoring Integration
 * ==============================================================================
 * Formats production logs as structured JSON objects for centralized log ingestion
 * (Datadog, CloudWatch, Grafana Loki, or Google Cloud Logging).
 * Automatically redacts PII and provides a zero-dependency Sentry bridge.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "AUDIT" | "SECURITY";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
  environment: string;
}

class AppLogger {
  private environment = process.env.NODE_ENV || "development";

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    err?: Error | unknown
  ): LogEntry {
    let errorObj: LogEntry["error"];
    if (err instanceof Error) {
      errorObj = {
        name: err.name,
        message: err.message,
        stack: this.environment === "production" ? undefined : err.stack,
      };
    } else if (err) {
      errorObj = {
        message: String(err),
      };
    }

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata: metadata ? sanitizeAuditMetadata(metadata) : undefined,
      error: errorObj,
      environment: this.environment,
    };
  }

  private output(entry: LogEntry) {
    const isProd = this.environment === "production";
    const line = isProd ? JSON.stringify(entry) : `[${entry.timestamp}] [${entry.level}] ${entry.context ? `(${entry.context}) ` : ""}${entry.message}`;

    if (entry.level === "ERROR" || entry.level === "SECURITY") {
      console.error(line, !isProd && entry.metadata ? entry.metadata : "");
      if (!isProd && entry.error?.stack) {
        console.error(entry.error.stack);
      }
      this.forwardToSentry(entry);
    } else if (entry.level === "WARN") {
      console.warn(line, !isProd && entry.metadata ? entry.metadata : "");
    } else {
      console.log(line, !isProd && entry.metadata ? entry.metadata : "");
    }
  }

  /**
   * Safe bridge to Sentry if initialized in the environment.
   */
  private forwardToSentry(entry: LogEntry) {
    if (typeof (globalThis as any).Sentry !== "undefined") {
      try {
        if (entry.error) {
          (globalThis as any).Sentry.captureException(entry.error, {
            extra: entry.metadata,
            tags: { context: entry.context, level: entry.level },
          });
        } else {
          (globalThis as any).Sentry.captureMessage(entry.message, {
            level: entry.level.toLowerCase(),
            extra: entry.metadata,
          });
        }
      } catch {
        // Fail silent to not crash application
      }
    }
  }

  info(message: string, context?: string, metadata?: Record<string, any>) {
    this.output(this.formatEntry("INFO", message, context, metadata));
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.output(this.formatEntry("WARN", message, context, metadata));
  }

  error(message: string, err?: Error | unknown, context?: string, metadata?: Record<string, any>) {
    this.output(this.formatEntry("ERROR", message, context, metadata, err));
  }

  audit(message: string, context?: string, metadata?: Record<string, any>) {
    this.output(this.formatEntry("AUDIT", message, context, metadata));
  }

  security(message: string, context?: string, metadata?: Record<string, any>) {
    this.output(this.formatEntry("SECURITY", message, context, metadata));
  }
}

export const logger = new AppLogger();
