package com.mealapp.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.mealapp")
public class MealRecommendationApplication {
    public static void main(String[] args) {
        SpringApplication.run(MealRecommendationApplication.class, args);
    }
}
