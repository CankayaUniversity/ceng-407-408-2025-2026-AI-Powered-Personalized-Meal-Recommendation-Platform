package com.mealapp.infrastructure.test;

import com.zaxxer.hikari.HikariDataSource;
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
        var database = PostgresSingleton.INSTANCE;

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
    DataSource dataSource(JdbcConnectionDetails details, Environment env) {
        String jdbcUrl = details.getJdbcUrl();
        String username = details.getUsername();
        String password = details.getPassword();

        // Eğer jdbcdslog veya özel logging proxy gerekiyorsa burası güncellenebilir.
        // Şimdilik standart HikariDataSource döndürüyoruz.
        return DataSourceBuilder.create()
            .type(HikariDataSource.class)
            .driverClassName("org.postgresql.Driver")
            .url(jdbcUrl)
            .username(username)
            .password(password)
            .build();
    }
}
