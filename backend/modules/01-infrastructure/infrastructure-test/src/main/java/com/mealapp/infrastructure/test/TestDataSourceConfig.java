package com.mealapp.infrastructure.test;

import com.zaxxer.hikari.HikariDataSource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.boot.autoconfigure.jdbc.JdbcConnectionDetails;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;

@TestConfiguration
public class TestDataSourceConfig {

    @Bean
    JdbcConnectionDetails sharedPostgresDetails() {
        var database = PostgresSingleton.INSTANCE; // Projene uygun singleton

        return new JdbcConnectionDetails() {
            @Override
            public String getJdbcUrl() {
                return database.getJdbcUrl();
            }

            @Override
            public String getUsername() {
                return database.getUsername();
            }

            @Override
            public String getPassword() {
                return database.getPassword();
            }

            @Override
            public String getDriverClassName() {
                return "org.postgresql.Driver";
            }
        };
    }

    @Bean
    @Primary
    DataSource loggingDataSource(JdbcConnectionDetails details, Environment env) {
        String jdbcUrl = details.getJdbcUrl();
        String rawUrl = StringUtils.substringAfter(jdbcUrl, "jdbc:");
        String username = details.getUsername();
        String password = details.getPassword();

        String schema = env.getProperty("database.schema");
        if (schema != null && !schema.isBlank() && !rawUrl.contains("currentSchema")) {
            rawUrl = rawUrl + (rawUrl.contains("?") ? "&" : "?") + "currentSchema=" + schema;
        }

        String loggingUrl = "jdbc:jdbcdslog:" + rawUrl + ";targetDriver=org.postgresql.Driver";

        return DataSourceBuilder.create()
            .type(HikariDataSource.class)
            .driverClassName("org.jdbcdslog.DriverLoggingProxy")
            .url(loggingUrl)
            .username(username)
            .password(password)
            .build();
    }

}