import {createContext, useContext} from 'react';
import type {ServiceKey} from './ServiceKey.ts';
import {ServiceRegistry} from './ServiceRegistry.tsx';

/**
 * The React Context that will hold our services
 */
export const ServiceContext = createContext<ServiceRegistry | null>(null);

/**
 * Custom hook to access the service container
 *
 * @returns The dynamic service container
 * @throws Error if used outside a ServiceProvider
 */
export const useServiceRegistry = (): ServiceRegistry => {
    const context = useContext(ServiceContext);
    if (context === null) {
        throw new Error('useServiceRegistry must be used within a ServiceProvider');
    }
    return context;
};

/**
 * Custom hook to access a specific service by its key
 *
 * @param serviceKey - The key of the service to retrieve
 * @returns The requested service instance
 * @throws Error if used outside a ServiceProvider or if the service doesn't exist
 */
export const useService = <T, >(serviceKey: ServiceKey<T>): T => {
    const registry = useServiceRegistry();
    const service = registry.get(serviceKey);
    if (service === undefined) {
        throw new Error(`Service with key "${serviceKey.toString()}" not found`);
    }
    return service;
};
