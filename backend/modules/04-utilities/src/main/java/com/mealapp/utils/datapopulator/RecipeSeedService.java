package com.mealapp.utils.datapopulator;

import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Uygulama ilk ayağa kalktığında veritabanını örnek verilerle dolduran servis.
 * Sadece veritabanı boşsa çalışır.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class RecipeSeedService implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RecipeRepository recipeRepository;
    private final InventoryRepository inventoryRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() == 0) {
            log.info("Veritabanı boş. Örnek veriler yükleniyor...");
            seedData();
            log.info("Örnek veriler başarıyla yüklendi.");
        } else {
            log.info("Veritabanında kayıtlı kullanıcılar mevcut, seed işlemi atlanıyor.");
        }
    }

    private void seedData() {
        // 1. Örnek Kullanıcılar
        User berk = User.builder()
                .name("Berk Memis")
                .email("berk@example.com")
                .age(25)
                .height(180.0)
                .weight(80.0)
                .gender(User.Gender.MALE)
                .activityLevel(User.ActivityLevel.MODERATELY_ACTIVE)
                .dietaryGoal(User.DietaryGoal.BUILD_MUSCLE)
                .dietType(User.DietType.NONE)
                .dailyCalorieTarget(2800)
                .build();

        User ayse = User.builder()
                .name("Ayşe Yılmaz")
                .email("ayse@example.com")
                .age(28)
                .height(165.0)
                .weight(55.0)
                .gender(User.Gender.FEMALE)
                .activityLevel(User.ActivityLevel.LIGHTLY_ACTIVE)
                .dietaryGoal(User.DietaryGoal.MAINTAIN_WEIGHT)
                .dietType(User.DietType.VEGETARIAN)
                .dailyCalorieTarget(1800)
                .build();

        userRepository.saveAll(List.of(berk, ayse));

        // 2. Örnek Tarifler
        Recipe mercimek = Recipe.builder()
                .title("Klasik Mercimek Çorbası")
                .ingredients(List.of("Kırmızı Mercimek", "Soğan", "Havuç", "Patates", "Zeytinyağı"))
                .instructions("1. Sebzeleri doğrayın. 2. Mercimekle birlikte haşlayın. 3. Blenderdan geçirin.")
                .preparationTimeMinutes(30)
                .difficulty(Recipe.Difficulty.EASY)
                .calories(250)
                .build();

        Recipe tavukluPilav = Recipe.builder()
                .title("Tavuklu Pilav")
                .ingredients(List.of("Pirinç", "Tavuk Göğsü", "Tereyağı", "Nohut"))
                .instructions("1. Tavuğu haşlayın. 2. Pirinci kavurun. 3. Tavuk suyuyla pişirin.")
                .preparationTimeMinutes(45)
                .difficulty(Recipe.Difficulty.MEDIUM)
                .calories(450)
                .build();

        Recipe kinoaSalatasi = Recipe.builder()
                .title("Kinoa Salatası")
                .ingredients(List.of("Kinoa", "Domates", "Salatalık", "Maydanoz", "Limon"))
                .instructions("1. Kinoayı haşlayın. 2. Sebzeleri doğrayın. 3. Soslayıp karıştırın.")
                .preparationTimeMinutes(20)
                .difficulty(Recipe.Difficulty.EASY)
                .calories(320)
                .build();

        recipeRepository.saveAll(List.of(mercimek, tavukluPilav, kinoaSalatasi));

        // 3. Örnek Envanter (Berk'in dolabı)
        Inventory pirinc = Inventory.builder()
                .user(berk)
                .ingredientName("Pirinç")
                .quantity(1000.0)
                .unit("GRAM")
                .build();

        Inventory mercimekInv = Inventory.builder()
                .user(berk)
                .ingredientName("Kırmızı Mercimek")
                .quantity(500.0)
                .unit("GRAM")
                .build();

        inventoryRepository.saveAll(List.of(pirinc, mercimekInv));
    }
}
