/**
 * Type for service keys
 * Using symbols provides type safety and prevents accidental key collisions
 */
export type ServiceKey<T> = symbol & { __type: T };

/**
 * Helper function to create a typed service key
 *
 * @param description - Human-readable description of the service
 * @returns A typed symbol that can be used as a service key
 */
export function createServiceKey<T>(description: string): ServiceKey<T> {
    const symbol = Symbol(description);
    return symbol as ServiceKey<T>;
}
