package com.mealapp.domain.user.util;

import com.mealapp.domain.user.entity.User;

/**
 * Kullanıcının fiziksel verilerine dayanarak kalori hesabı yapan yardımcı sınıf.
 * Harris-Benedict formülü kullanarak BMR ve TDEE değerlerini hesaplar.
 */
public class CalorieCalculator {

    /**
     * Kullanıcının fiziksel özelliklerine ve hedefine göre günlük kalori ihtiyacını hesaplar.
     */
    public static Integer calculateDailyTarget(User user) {
        if (user.getWeight() == null || user.getHeight() == null || user.getAge() == null || user.getGender() == null) {
            return 2000; // Varsayılan değer
        }

        double bmr;
        if (user.getGender() == User.Gender.MALE) {
            bmr = 88.362 + (13.397 * user.getWeight()) + (4.799 * user.getHeight()) - (5.677 * user.getAge());
        } else {
            bmr = 447.593 + (9.247 * user.getWeight()) + (3.098 * user.getHeight()) - (4.330 * user.getAge());
        }

        double tdee = bmr * getActivityMultiplier(user.getActivityLevel());

        // Hedefe göre kalori ayarlama
        return switch (user.getDietaryGoal()) {
            case LOSE_WEIGHT -> (int) (tdee - 500);
            case GAIN_WEIGHT, BUILD_MUSCLE -> (int) (tdee + 500);
            case MAINTAIN_WEIGHT -> (int) tdee;
            default -> (int) tdee;
        };
    }

    private static double getActivityMultiplier(User.ActivityLevel level) {
        if (level == null) return 1.2;
        return switch (level) {
            case SEDENTARY -> 1.2;
            case LIGHTLY_ACTIVE -> 1.375;
            case MODERATELY_ACTIVE -> 1.55;
            case VERY_ACTIVE -> 1.725;
            case EXTRA_ACTIVE -> 1.9;
        };
    }
}
