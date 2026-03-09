import type {AxiosInstance} from 'axios';
import {createServiceKey} from '../di';
import type {AuthService} from './auth/AuthService';
import type {LoggerService} from './logging/LoggerService';

export const LoggerServiceKey = createServiceKey<LoggerService>("LoggerService");
export const AuthServiceKey = createServiceKey<AuthService>("AuthService");
export const HttpClientKey = createServiceKey<AxiosInstance>("HttpClient");

export * from './auth/AuthService';
export * from './auth/KeycloakAuthService';
export * from './logging/LoggerService';
export * from './logging/ConsoleLoggerService';
