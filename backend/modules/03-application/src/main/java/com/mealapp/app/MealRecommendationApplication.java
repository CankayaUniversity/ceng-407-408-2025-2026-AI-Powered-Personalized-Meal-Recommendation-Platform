package com.mealapp.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.retry.annotation.EnableRetry;

@SpringBootApplication(scanBasePackages = "com.mealapp")
@EnableCaching
@EnableRetry
@org.springframework.boot.context.properties.ConfigurationPropertiesScan("com.mealapp")
public class MealRecommendationApplication {
    public static void main(String[] args) {
        SpringApplication.run(MealRecommendationApplication.class, args);
    }
}
