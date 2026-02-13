export enum LogLevel {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DEBUG = 'debug'
}

interface LogContext {
    [key: string]: any;
}

class Logger {
    private defaultContext: LogContext = {};

    constructor(context: LogContext = {}) {
        this.defaultContext = context;
    }

    private log(level: LogLevel, message: string, context?: LogContext) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...this.defaultContext,
            ...context
        };
        console.log(JSON.stringify(entry));
    }

    info(message: string, context?: LogContext) {
        this.log(LogLevel.INFO, message, context);
    }

    warn(message: string, context?: LogContext) {
        this.log(LogLevel.WARN, message, context);
    }

    error(message: string, context?: LogContext) {
        this.log(LogLevel.ERROR, message, context);
    }

    debug(message: string, context?: LogContext) {
        this.log(LogLevel.DEBUG, message, context);
    }

    child(context: LogContext): Logger {
        return new Logger({ ...this.defaultContext, ...context });
    }
}

export const logger = new Logger({ service: 'picket-backend' });
