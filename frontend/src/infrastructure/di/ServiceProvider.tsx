import React from 'react';
import {ServiceContext} from './ServiceContext.ts';
import type {ServiceRegistry} from './ServiceRegistry.tsx';

/**
 * Props for the ServiceProvider component
 */
interface ServiceProviderProps {
    registry: ServiceRegistry;
    children: React.ReactNode;
}

/**
 * ServiceProvider component that provides the service container to the component tree
 *
 * @param services - Object containing all service instances to be provided
 * @param children - Child components that will have access to the services
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({registry, children}) => {
    return (
        <ServiceContext.Provider value={registry}>
            {children}
        </ServiceContext.Provider>
    );
};
