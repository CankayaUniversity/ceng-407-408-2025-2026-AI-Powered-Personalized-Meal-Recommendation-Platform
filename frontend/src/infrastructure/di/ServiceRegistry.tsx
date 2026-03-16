import type {ServiceKey} from './ServiceKey.ts';

/**
 * Interface for service factory functions
 * A factory function creates and returns a service instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceFactory<T = any> = () => T;

/**
 * ServiceRegistry class for managing service registration and instantiation
 *
 * This class provides a centralized way to register services and their dependencies
 * and then create a service container with all instantiated services.
 */
export class ServiceRegistry {
    private factories = new Map<symbol, ServiceFactory>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private instances = new Map<symbol, any>();
    private instantiating = new Set<symbol>();

    /**
     * Register a service with the registry
     *
     * @param serviceKey - Unique identifier for the service
     * @param factory - Factory function that creates the service instance
     * @returns The registry instance for chaining
     */
    register<T>(serviceKey: ServiceKey<T>, factory: ServiceFactory<T>): ServiceRegistry {
        const symbol = serviceKey as unknown as symbol;
        if (this.factories.has(symbol) || this.instances.has(symbol) || this.instantiating.has(symbol)) {
            return this;
        }

        this.factories.set(symbol, factory);
        return this;
    }

    /**
     * Get a service instance by its key
     * If the service hasn't been instantiated yet, it will be created
     *
     * @param serviceKey - The key of the service to retrieve
     * @returns The service instance
     * @throws Error if the service is not registered or if there's a circular dependency
     */
    get<T>(serviceKey: ServiceKey<T>): T {
        const symbol = serviceKey as unknown as symbol;

        // Check if we already have an instance
        if (this.instances.has(symbol)) {
            return this.instances.get(symbol) as T;
        }

        // Check if the service is registered
        const factory = this.factories.get(symbol);
        if (!factory) {
            throw new Error(`Service with key "${symbol.toString()}" is not registered`);
        }

        // Check for circular dependencies
        if (this.instantiating.has(symbol)) {
            throw new Error(`Circular dependency detected while instantiating "${symbol.toString()}"`);
        }

        // Mark as being instantiated to detect circular dependencies
        this.instantiating.add(symbol);

        try {
            // Create the instance
            const instance = factory();
            this.instances.set(symbol, instance);
            return instance as T;
        }
        finally {
            // Remove from the instantiating set
            this.instantiating.delete(symbol);
        }
    }

    /**
     * Reset the registry by clearing all instances
     */
    reset(): void {
        this.instances.clear();
        this.instantiating.clear();
    }
}
