package com.mealapp.app.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(basePackages = "com.mealapp.domain.*.repository")
@EntityScan(basePackages = "com.mealapp.domain.*.entity")
public class JpaConfig {
}
