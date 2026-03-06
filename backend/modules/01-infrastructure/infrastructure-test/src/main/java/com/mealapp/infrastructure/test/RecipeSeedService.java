package com.mealapp.infrastructure.test;

import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.entity.IngredientNutrition;
import java.util.ArrayList;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.recipe.repository.IngredientRepository;
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
    private final IngredientRepository ingredientRepository;
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

        // 2. Örnek Malzemeler (Global Sözlük)
        Ingredient mercimekIng = Ingredient.builder().name("Kırmızı Mercimek").category(Ingredient.Category.GRAIN).build();
        mercimekIng.setNutrition(IngredientNutrition.builder().ingredient(mercimekIng).caloriesPer100g(341.0).proteinPer100g(24.6).carbsPer100g(52.7).fatPer100g(1.1).build());

        Ingredient sogan = Ingredient.builder().name("Soğan").category(Ingredient.Category.VEGETABLE).build();
        sogan.setNutrition(IngredientNutrition.builder().ingredient(sogan).caloriesPer100g(40.0).proteinPer100g(1.1).carbsPer100g(9.3).fatPer100g(0.1).build());

        Ingredient havuc = Ingredient.builder().name("Havuç").category(Ingredient.Category.VEGETABLE).build();
        havuc.setNutrition(IngredientNutrition.builder().ingredient(havuc).caloriesPer100g(41.0).proteinPer100g(0.9).carbsPer100g(9.6).fatPer100g(0.2).build());

        Ingredient patates = Ingredient.builder().name("Patates").category(Ingredient.Category.VEGETABLE).build();
        patates.setNutrition(IngredientNutrition.builder().ingredient(patates).caloriesPer100g(77.0).proteinPer100g(2.0).carbsPer100g(17.5).fatPer100g(0.1).build());

        Ingredient zeytinyagi = Ingredient.builder().name("Zeytinyağı").category(Ingredient.Category.OIL).build();
        zeytinyagi.setNutrition(IngredientNutrition.builder().ingredient(zeytinyagi).caloriesPer100g(884.0).proteinPer100g(0.0).carbsPer100g(0.0).fatPer100g(100.0).build());

        Ingredient pirincIng = Ingredient.builder().name("Pirinç").category(Ingredient.Category.GRAIN).build();
        pirincIng.setNutrition(IngredientNutrition.builder().ingredient(pirincIng).caloriesPer100g(130.0).proteinPer100g(2.7).carbsPer100g(28.2).fatPer100g(0.3).build());

        Ingredient tavuk = Ingredient.builder().name("Tavuk Göğsü").category(Ingredient.Category.MEAT).build();
        tavuk.setNutrition(IngredientNutrition.builder().ingredient(tavuk).caloriesPer100g(165.0).proteinPer100g(31.0).carbsPer100g(0.0).fatPer100g(3.6).build());

        Ingredient tereyagi = Ingredient.builder().name("Tereyağı").category(Ingredient.Category.DAIRY).build();
        tereyagi.setNutrition(IngredientNutrition.builder().ingredient(tereyagi).caloriesPer100g(717.0).proteinPer100g(0.9).carbsPer100g(0.1).fatPer100g(81.0).build());

        Ingredient nohut = Ingredient.builder().name("Nohut").category(Ingredient.Category.GRAIN).build();
        nohut.setNutrition(IngredientNutrition.builder().ingredient(nohut).caloriesPer100g(164.0).proteinPer100g(8.9).carbsPer100g(27.4).fatPer100g(2.6).build());

        Ingredient kinoa = Ingredient.builder().name("Kinoa").category(Ingredient.Category.GRAIN).build();
        kinoa.setNutrition(IngredientNutrition.builder().ingredient(kinoa).caloriesPer100g(120.0).proteinPer100g(4.4).carbsPer100g(21.3).fatPer100g(1.9).build());

        Ingredient domates = Ingredient.builder().name("Domates").category(Ingredient.Category.VEGETABLE).build();
        domates.setNutrition(IngredientNutrition.builder().ingredient(domates).caloriesPer100g(18.0).proteinPer100g(0.9).carbsPer100g(3.9).fatPer100g(0.2).build());

        Ingredient salatalik = Ingredient.builder().name("Salatalık").category(Ingredient.Category.VEGETABLE).build();
        salatalik.setNutrition(IngredientNutrition.builder().ingredient(salatalik).caloriesPer100g(15.0).proteinPer100g(0.7).carbsPer100g(3.6).fatPer100g(0.1).build());

        Ingredient maydanoz = Ingredient.builder().name("Maydanoz").category(Ingredient.Category.VEGETABLE).build();
        maydanoz.setNutrition(IngredientNutrition.builder().ingredient(maydanoz).caloriesPer100g(36.0).proteinPer100g(3.0).carbsPer100g(6.3).fatPer100g(0.8).build());

        Ingredient limon = Ingredient.builder().name("Limon").category(Ingredient.Category.FRUIT).build();
        limon.setNutrition(IngredientNutrition.builder().ingredient(limon).caloriesPer100g(29.0).proteinPer100g(1.1).carbsPer100g(9.3).fatPer100g(0.3).build());

        ingredientRepository.saveAll(List.of(
                mercimekIng, sogan, havuc, patates, zeytinyagi, 
                pirincIng, tavuk, tereyagi, nohut, 
                kinoa, domates, salatalik, maydanoz, limon
        ));

        // 3. Örnek Tarifler
        Recipe mercimek = Recipe.builder()
                .title("Klasik Mercimek Çorbası")
                .instructions("1. Sebzeleri doğrayın. 2. Mercimekle birlikte haşlayın. 3. Blenderdan geçirin.")
                .preparationTimeMinutes(30)
                .difficulty(Recipe.Difficulty.EASY)
                .recipeIngredients(new ArrayList<>())
                .build();

        mercimek.getRecipeIngredients().add(RecipeIngredient.builder().recipe(mercimek).ingredient(mercimekIng).grams(200.0).build());
        mercimek.getRecipeIngredients().add(RecipeIngredient.builder().recipe(mercimek).ingredient(sogan).grams(100.0).build());
        mercimek.getRecipeIngredients().add(RecipeIngredient.builder().recipe(mercimek).ingredient(havuc).grams(50.0).build());
        mercimek.getRecipeIngredients().add(RecipeIngredient.builder().recipe(mercimek).ingredient(patates).grams(100.0).build());
        mercimek.getRecipeIngredients().add(RecipeIngredient.builder().recipe(mercimek).ingredient(zeytinyagi).grams(20.0).build());

        Recipe tavukluPilav = Recipe.builder()
                .title("Tavuklu Pilav")
                .instructions("1. Tavuğu haşlayın. 2. Pirinci kavurun. 3. Tavuk suyuyla pişirin.")
                .preparationTimeMinutes(45)
                .difficulty(Recipe.Difficulty.MEDIUM)
                .recipeIngredients(new ArrayList<>())
                .build();

        tavukluPilav.getRecipeIngredients().add(RecipeIngredient.builder().recipe(tavukluPilav).ingredient(pirincIng).grams(300.0).build());
        tavukluPilav.getRecipeIngredients().add(RecipeIngredient.builder().recipe(tavukluPilav).ingredient(tavuk).grams(250.0).build());
        tavukluPilav.getRecipeIngredients().add(RecipeIngredient.builder().recipe(tavukluPilav).ingredient(tereyagi).grams(30.0).build());
        tavukluPilav.getRecipeIngredients().add(RecipeIngredient.builder().recipe(tavukluPilav).ingredient(nohut).grams(50.0).build());

        Recipe kinoaSalatasi = Recipe.builder()
                .title("Kinoa Salatası")
                .instructions("1. Kinoayı haşlayın. 2. Sebzeleri doğrayın. 3. Soslayıp karıştırın.")
                .preparationTimeMinutes(20)
                .difficulty(Recipe.Difficulty.EASY)
                .recipeIngredients(new ArrayList<>())
                .build();

        kinoaSalatasi.getRecipeIngredients().add(RecipeIngredient.builder().recipe(kinoaSalatasi).ingredient(kinoa).grams(150.0).build());
        kinoaSalatasi.getRecipeIngredients().add(RecipeIngredient.builder().recipe(kinoaSalatasi).ingredient(domates).grams(100.0).build());
        kinoaSalatasi.getRecipeIngredients().add(RecipeIngredient.builder().recipe(kinoaSalatasi).ingredient(salatalik).grams(100.0).build());
        kinoaSalatasi.getRecipeIngredients().add(RecipeIngredient.builder().recipe(kinoaSalatasi).ingredient(maydanoz).grams(30.0).build());
        kinoaSalatasi.getRecipeIngredients().add(RecipeIngredient.builder().recipe(kinoaSalatasi).ingredient(limon).grams(20.0).build());

        recipeRepository.saveAll(List.of(mercimek, tavukluPilav, kinoaSalatasi));

        // 4. Örnek Envanter (Berk'in dolabı)
        Inventory pirinc = Inventory.builder()
                .user(berk)
                .ingredient(pirincIng)
                .quantity(1000.0)
                .unit("GRAM")
                .build();

        Inventory mercimekInv = Inventory.builder()
                .user(berk)
                .ingredient(mercimekIng)
                .quantity(500.0)
                .unit("GRAM")
                .build();

        inventoryRepository.saveAll(List.of(pirinc, mercimekInv));
    }
}
