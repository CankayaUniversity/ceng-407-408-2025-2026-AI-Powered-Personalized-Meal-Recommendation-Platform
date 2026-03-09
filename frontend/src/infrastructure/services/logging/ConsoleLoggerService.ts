import {LoggerService} from './LoggerService';

export class ConsoleLoggerService implements LoggerService {
    trace(...args: unknown[]): void {
        console.trace(...args);
    }
    debug(...args: unknown[]): void {
        console.debug(...args);
    }
    info(...args: unknown[]): void {
        console.info(...args);
    }
    warn(...args: unknown[]): void {
        console.warn(...args);
    }
    error(...args: unknown[]): void {
        console.error(...args);
    }
}
