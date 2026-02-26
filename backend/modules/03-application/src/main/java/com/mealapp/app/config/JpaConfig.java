package com.mealapp.app.config;

import com.mealapp.infrastructure.repository.QueryDslCustomRepositoryFactoryBean;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(
    basePackages = "com.mealapp.domain",
    repositoryFactoryBeanClass = QueryDslCustomRepositoryFactoryBean.class
)
@EntityScan(basePackages = "com.mealapp.domain")
public class JpaConfig {
}