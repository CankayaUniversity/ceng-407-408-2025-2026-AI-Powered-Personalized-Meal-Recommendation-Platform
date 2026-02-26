package com.mealapp.infrastructure.test;

import org.testcontainers.postgresql.PostgreSQLContainer;

public final class PostgresSingleton {
    private PostgresSingleton() {}

    public static final PostgreSQLContainer INSTANCE = new PostgreSQLContainer("postgres:17.6-alpine")
        .withDatabaseName("meal_app_db")
        .withUsername("test")
        .withPassword("test")
        .withReuse(true);

    static {
        INSTANCE.start();
    }
}