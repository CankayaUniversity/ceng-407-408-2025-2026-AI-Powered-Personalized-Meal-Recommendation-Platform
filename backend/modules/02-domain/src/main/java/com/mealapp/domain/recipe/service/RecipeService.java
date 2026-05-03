package com.mealapp.domain.recipe.service;

import com.mealapp.domain.common.storage.FileStorageService;
import com.mealapp.domain.notification.entity.Notification;
import com.mealapp.domain.notification.service.NotificationService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.entity.RecipeStatus;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.List;
import java.util.Optional;

/**
 * Yemek tarifleri ile ilgili iş mantığını yöneten servis.
 * Tarif filtreleme, besin değeri senkronizasyonu ve diyet uyumluluk kontrollerini yapar.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final IngredientRepository ingredientRepository;
    private final UnitConverterService unitConverterService;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    /**
     * Yeni bir tarif oluşturur. Kullanıcı oluşturuyorsa statüsü DRAFT olur.
     */
    @Transactional
    public Recipe createRecipe(Recipe recipe, List<RecipeIngredient> ingredients) {
        recipe.setStatus(RecipeStatus.DRAFT);
        recipe.setActive(true);
        Recipe savedRecipe = recipeRepository.save(recipe);

        if (ingredients != null) {
            setupIngredients(savedRecipe, ingredients);
        }

        calculateAndSetNutrition(savedRecipe);
        return savedRecipe;
    }

    /**
     * Mevcut bir tarifi günceller. 
     * Eğer tarif APPROVED ise yeni bir PENDING kaydı (update request) oluşturur.
     * Değilse doğrudan mevcut kaydı günceller.
     */
    @Transactional
    public Recipe updateRecipe(Long id, Recipe updatedData, List<RecipeIngredient> ingredients, String userId) {
        Recipe existing = recipeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Tarif bulunamadı: " + id));

        // Eğer onaylanmış bir tarif düzenleniyorsa, orijinali bozmamak için yeni bir 'pending update' oluştururuz.
        if (existing.getStatus() == RecipeStatus.APPROVED) {
            // Zaten bekleyen bir güncelleme var mı kontrol et? 
            // Varsa onu güncelle, yoksa yeni oluştur.
            Recipe pendingUpdate = recipeRepository.findByParentIdAndStatus(id, RecipeStatus.PENDING)
                .orElse(new Recipe());
            
            pendingUpdate.setParentId(id);
            
            if (updatedData.getTitle() != null) {
                pendingUpdate.setTitle(updatedData.getTitle());
            } else {
                pendingUpdate.setTitle(existing.getTitle());
            }

            if (updatedData.getInstructions() != null) {
                pendingUpdate.setInstructions(updatedData.getInstructions());
            } else {
                pendingUpdate.setInstructions(existing.getInstructions());
            }

            if (updatedData.getPreparationTimeMinutes() != null) {
                pendingUpdate.setPreparationTimeMinutes(updatedData.getPreparationTimeMinutes());
            } else {
                pendingUpdate.setPreparationTimeMinutes(existing.getPreparationTimeMinutes());
            }

            if (updatedData.getServings() != null) {
                pendingUpdate.setServings(updatedData.getServings());
            } else {
                pendingUpdate.setServings(existing.getServings());
            }

            if (updatedData.getDifficulty() != null) {
                pendingUpdate.setDifficulty(updatedData.getDifficulty());
            } else {
                pendingUpdate.setDifficulty(existing.getDifficulty());
            }

            if (updatedData.getCategory() != null) {
                pendingUpdate.setCategory(updatedData.getCategory());
            } else {
                pendingUpdate.setCategory(existing.getCategory());
            }

            // Zorunlu alanları orijinden kopyala
            pendingUpdate.setAverageRating(existing.getAverageRating());
            pendingUpdate.setRatingCount(existing.getRatingCount());
            pendingUpdate.setActive(true);

            pendingUpdate.setStatus(RecipeStatus.PENDING);
            pendingUpdate.setCreatedBy(userId);
            
            if (updatedData.getImageUrl() != null) {
                pendingUpdate.setImageUrl(updatedData.getImageUrl());
            } else {
                pendingUpdate.setImageUrl(existing.getImageUrl());
            }

            Recipe savedUpdate = recipeRepository.save(pendingUpdate);
            if (ingredients != null) {
                if (savedUpdate.getRecipeIngredients() != null) {
                    savedUpdate.getRecipeIngredients().clear();
                }
                setupIngredients(savedUpdate, ingredients);
            }
            calculateAndSetNutrition(savedUpdate);
            
            // Onay bekleyen bir güncelleme olduğu için adminlere haber ver
            notifyAdminsForApproval(savedUpdate);
            
            return savedUpdate;
        }

        // Taslak veya reddedilmiş ise doğrudan üzerine yazarız
        if (updatedData.getTitle() != null) {
            existing.setTitle(updatedData.getTitle());
        }
        if (updatedData.getInstructions() != null) {
            existing.setInstructions(updatedData.getInstructions());
        }
        if (updatedData.getPreparationTimeMinutes() != null) {
            existing.setPreparationTimeMinutes(updatedData.getPreparationTimeMinutes());
        }
        if (updatedData.getServings() != null) {
            existing.setServings(updatedData.getServings());
        }
        if (updatedData.getDifficulty() != null) {
            existing.setDifficulty(updatedData.getDifficulty());
        }
        if (updatedData.getCategory() != null) {
            existing.setCategory(updatedData.getCategory());
        }
        if (updatedData.getImageUrl() != null) {
            existing.setImageUrl(updatedData.getImageUrl());
        }

        // Düzenlendiği için tekrar PENDING veya DRAFT kalabilir. 
        // Kullanıcı 'Kaydet' dediyse DRAFT, 'Kaydet & Yayınla' dediyse PENDING olmalı.
        // Bu ayrımı updatedData.getStatus() üzerinden alabiliriz.
        if (updatedData.getStatus() != null) {
            existing.setStatus(updatedData.getStatus());
        }

        if (ingredients != null) {
            if (existing.getRecipeIngredients() != null) {
                existing.getRecipeIngredients().clear();
            }
            setupIngredients(existing, ingredients);
        }

        calculateAndSetNutrition(existing);
        return recipeRepository.save(existing);
    }

    /**
     * Tarifi onaya gönderir.
     */
    @Transactional
    public void sendToApproval(Long recipeId, String userId) {
        Recipe recipe = recipeRepository.findById(recipeId)
            .orElseThrow(() -> new RuntimeException("Tarif bulunamadı: " + recipeId));
        
        if (!recipe.getCreatedBy().equals(userId)) {
            throw new RuntimeException("Bu işlemi yapmak için yetkiniz yok.");
        }

        if (recipe.getStatus() == RecipeStatus.DRAFT || recipe.getStatus() == RecipeStatus.REJECTED) {
            recipe.setStatus(RecipeStatus.PENDING);
            recipeRepository.save(recipe);
            notifyAdminsForApproval(recipe);
        }
    }

    private void notifyAdminsForApproval(Recipe recipe) {
        List<User> admins = userRepository.findAllAdmins();
        String title = "Yeni Tarif Onay Bekliyor";
        String message = recipe.getTitle() + " başlıklı tarif onayınızı bekliyor.";
        
        for (User admin : admins) {
            notificationService.createNotification(
                admin, 
                title, 
                message, 
                Notification.NotificationType.RECIPE_APPROVAL, 
                recipe.getId().toString()
            );
        }
    }

    private void setupIngredients(Recipe recipe, List<RecipeIngredient> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) {
            recipe.setRecipeIngredients(new java.util.ArrayList<>());
            return;
        }
        for (RecipeIngredient ri : ingredients) {
            ri.setRecipe(recipe);
            
            Ingredient ingredient;
            if (ri.getIngredient() != null && ri.getIngredient().getId() != null) {
                // Eğer ID verilmişse doğrudan ID üzerinden bul
                ingredient = ingredientRepository.findByIdAndActiveTrue(ri.getIngredient().getId())
                    .orElse(null); // Taslaklar için esnek olalım
                
                if (ingredient == null && recipe.getStatus() == RecipeStatus.APPROVED) {
                    throw new RuntimeException("Onaylı tarif için geçerli malzeme gerekli (ID): " + ri.getIngredient().getId());
                }
            } else if (ri.getIngredient() != null && ri.getIngredient().getName() != null) {
                // İsim verilmişse isim üzerinden bul
                String ingredientName = ri.getIngredient().getName();
                ingredient = ingredientRepository.findByNameIgnoreCaseAndActiveTrue(ingredientName)
                    .orElse(null);
                
                if (ingredient == null && recipe.getStatus() == RecipeStatus.APPROVED) {
                    throw new RuntimeException("Onaylı tarif için geçerli malzeme gerekli (İsim): " + ingredientName);
                }
            } else {
                ingredient = null;
            }
            
            ri.setIngredient(ingredient);
            
            // Onaylı bir tarif veya bekleyen bir güncelleme ise Malzeme zorunlu olmalı (DB kısıtı için)
            if (ingredient == null && (recipe.getStatus() == RecipeStatus.APPROVED || recipe.getStatus() == RecipeStatus.PENDING)) {
                 // Eğer malzeme yoksa, bu ingredient kaydını DB'ye eklemeyebiliriz veya hata verebiliriz.
                 // Mevcut tabloda ingredient_id nullable=false olduğu için bir dummy veya hata şart.
                 // Şimdilik hata vermeye devam edelim ama sadece APPROVED/PENDING için.
                 throw new RuntimeException("Onay bekleyen veya onaylı tarifler için geçerli malzeme veritabanında kayıtlı olmalıdır.");
            }
            
            // Zorunlu alanları kontrol et (NULL ise varsayılan ata)
            if (ri.getAmount() == null) ri.setAmount(0.0);
            if (ri.getUnit() == null) ri.setUnit("adet");
            
            // Eğer grams doğrudan verilmişse (frontend'den), hesaplamaya gerek yok veya sadece grams'ı set et
            if (ri.getGrams() == null) {
                if (ingredient != null) {
                    Double grams = unitConverterService.convertToGrams(ri.getAmount(), ri.getUnit(), ingredient);
                    ri.setGrams(grams);
                } else {
                    ri.setGrams(0.0);
                }
            }
        }
        recipe.setRecipeIngredients(ingredients);
    }

    /**
     * Onay bekleyen tarifleri getirir.
     */
    @Transactional(readOnly = true)
    public Page<Recipe> findPendingRecipes(Pageable pageable) {
        return recipeRepository.findByStatusAndActiveTrue(RecipeStatus.PENDING, pageable);
    }

    /**
     * Tarifi onaylar. 
     * Eğer bu bir güncelleme ise (parentId != null), değişiklikleri orijinal tarife uygular.
     */
    @Transactional
    public void approveRecipe(Long recipeId) {
        Recipe recipe = recipeRepository.findById(recipeId)
            .orElseThrow(() -> new RuntimeException("Tarif bulunamadı: " + recipeId));
        
        if (recipe.getParentId() != null) {
            Recipe original = recipeRepository.findById(recipe.getParentId())
                .orElseThrow(() -> new RuntimeException("Orijinal tarif bulunamadı: " + recipe.getParentId()));
            
            // Verileri kopyala
            original.setTitle(recipe.getTitle());
            original.setInstructions(recipe.getInstructions());
            original.setPreparationTimeMinutes(recipe.getPreparationTimeMinutes());
            original.setServings(recipe.getServings());
            original.setDifficulty(recipe.getDifficulty());
            original.setImageUrl(recipe.getImageUrl());
            original.setTotalCalories(recipe.getTotalCalories());
            original.setTotalProtein(recipe.getTotalProtein());
            original.setTotalCarbs(recipe.getTotalCarbs());
            original.setTotalFat(recipe.getTotalFat());

            // Malzemeleri güncelle
            original.getRecipeIngredients().clear();
            // Yeni malzemeleri kopyalarken Recipe referansını güncellemek lazım
            for (RecipeIngredient ri : recipe.getRecipeIngredients()) {
                RecipeIngredient newRi = RecipeIngredient.builder()
                    .recipe(original)
                    .ingredient(ri.getIngredient())
                    .amount(ri.getAmount())
                    .unit(ri.getUnit())
                    .grams(ri.getGrams())
                    .build();
                original.getRecipeIngredients().add(newRi);
            }
            
            recipeRepository.save(original);
            recipeRepository.delete(recipe); // Geçici güncellemeyi sil
        } else {
            recipe.setStatus(RecipeStatus.APPROVED);
            recipeRepository.save(recipe);
        }
    }

    /**
     * Tarifi reddeder.
     */
    @Transactional
    public void rejectRecipe(Long recipeId) {
        Recipe recipe = recipeRepository.findById(recipeId)
            .orElseThrow(() -> new RuntimeException("Tarif bulunamadı: " + recipeId));
        
        if (recipe.getParentId() != null) {
            // Eğer bir güncellemeyi reddediyorsak, sadece bu güncelleme kaydını silebiliriz
            // veya statüsünü REJECTED yapabiliriz. Kullanıcı görsün diye REJECTED yapalım.
            recipe.setStatus(RecipeStatus.REJECTED);
        } else {
            recipe.setStatus(RecipeStatus.REJECTED);
        }
        recipeRepository.save(recipe);
    }

    /**
     * Tarif görselini yükler ve URL'ini günceller.
     * Eğer tarif APPROVED ise, bu görsel değişikliği bir PENDING güncellemesi olarak kaydedilir.
     */
    public String uploadRecipeImage(Long recipeId, InputStream inputStream, String originalFilename, String contentType, String userId) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new RuntimeException("Tarif bulunamadı: " + recipeId));

        // Dosya adı formatı: recipes/{recipeId}/image_{timestamp}.{ext}
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String fileName = String.format("recipes/%d/image_%d%s", recipeId, System.currentTimeMillis(), extension);

        String uploadedFileName = fileStorageService.uploadFile(inputStream, fileName, contentType);

        if (recipe.getStatus() == RecipeStatus.APPROVED) {
            // Onaylı tarif için görsel değişikliği bir 'pending update' olarak kaydedilir
            Recipe pendingUpdate = recipeRepository.findByParentIdAndStatus(recipeId, RecipeStatus.PENDING)
                    .orElse(new Recipe());
            
            pendingUpdate.setParentId(recipeId);
            pendingUpdate.setStatus(RecipeStatus.PENDING);
            pendingUpdate.setCreatedBy(userId);
            pendingUpdate.setImageUrl(uploadedFileName);
            
            // Diğer alanlar boşsa orijinden kopyala (updateRecipe ile paralel mantık)
            if (pendingUpdate.getTitle() == null) pendingUpdate.setTitle(recipe.getTitle());
            if (pendingUpdate.getInstructions() == null) pendingUpdate.setInstructions(recipe.getInstructions());
            if (pendingUpdate.getPreparationTimeMinutes() == null) pendingUpdate.setPreparationTimeMinutes(recipe.getPreparationTimeMinutes());
            if (pendingUpdate.getServings() == null) pendingUpdate.setServings(recipe.getServings());
            if (pendingUpdate.getDifficulty() == null) pendingUpdate.setDifficulty(recipe.getDifficulty());

            recipeRepository.save(pendingUpdate);
        } else {
            // Taslak ise doğrudan üzerine yaz
            // Eski görseli sil (sadece taslak/reddedilmiş ise doğrudan silmek güvenli)
            if (recipe.getImageUrl() != null) {
                try {
                    fileStorageService.deleteFile(recipe.getImageUrl());
                } catch (Exception e) {
                    log.warn("Eski tarif görseli silinemedi: {}", recipe.getImageUrl(), e);
                }
            }
            recipe.setImageUrl(uploadedFileName);
            recipeRepository.save(recipe);
        }

        return uploadedFileName;
    }

    /**
     * Tarif görseli için geçici URL üretir.
     */
    public String getRecipeImageUrl(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return null;
        }
        return fileStorageService.getFileUrl(fileName);
    }

    /**
     * Tarifin toplam besin değerlerini hesaplar ve günceller.
     * Bu süreçte eğer malzeme gramajı (grams) eksikse (0 veya null),
     * unitConverterService üzerinden otomatik hesaplama yaparak veritabanını senkronize eder.
     */
    @Transactional
    public void calculateAndSetNutrition(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null || recipe.getRecipeIngredients().isEmpty()) {
            // Malzemeler yüklü değilse, fetch join içeren repository metodunu kullanalım
            recipe = recipeRepository.findByIdWithIngredients(recipe.getId())
                .orElse(recipe);
        }

        double totalCal = 0;
        double totalProt = 0;
        double totalCarb = 0;
        double totalFat = 0;

        if (recipe.getRecipeIngredients() != null) {
            for (RecipeIngredient ri : recipe.getRecipeIngredients()) {

                // 1. ADIM: Gramaj Senkronizasyonu (JIT Calculation)
                // Python'dan gelen veya manuel girilen 0 değerlerini gerçek gramaja çevirir
                if ((ri.getGrams() == null || ri.getGrams() == 0) && ri.getAmount() != null) {
                    Double calculatedGrams = unitConverterService.convertToGrams(
                        ri.getAmount(),
                        ri.getUnit(),
                        ri.getIngredient()
                    );
                    ri.setGrams(calculatedGrams);
                    // Not: @Transactional sayesinde döngü sonunda bu bilgi DB'ye yansır.
                }

                // 2. ADIM: Güncel gramaj üzerinden besin değerlerini hesapla
                if (ri.getIngredient() != null && ri.getIngredient().getNutrition() != null) {
                    double grams = ri.getGrams();
                    var nutrition = ri.getIngredient().getNutrition();

                    totalCal += (nutrition.getCaloriesPer100g() / 100.0) * grams;
                    totalProt += (nutrition.getProteinPer100g() / 100.0) * grams;
                    totalCarb += (nutrition.getCarbsPer100g() / 100.0) * grams;
                    totalFat += (nutrition.getFatPer100g() / 100.0) * grams;
                }
            }
        }

        recipe.setTotalCalories(totalCal);
        recipe.setTotalProtein(totalProt);
        recipe.setTotalCarbs(totalCarb);
        recipe.setTotalFat(totalFat);

        recipeRepository.save(recipe);
    }

    /**
     * Bir malzeme güncellendiğinde onu kullanan tüm tariflerin besin değerlerini (ve gramajlarını) tazeler.
     */
    @Transactional
    public void refreshRecipesByIngredient(Long ingredientId) {
        List<Recipe> recipes = recipeRepository.findByIngredientId(ingredientId);
        recipes.forEach(this::calculateAndSetNutrition);
    }

    /**
     * ID'ye göre tarif detaylarını getirir.
     * Besin değerleri veya gramajlar henüz hesaplanmamışsa (0 ise), hesaplayıp döner.
     */
    @Transactional
    public Optional<Recipe> findById(Long id) {
        return recipeRepository.findByIdWithIngredients(id).map(recipe -> {
            if (recipe.getTotalCalories() == null || recipe.getTotalCalories() == 0) {
                calculateAndSetNutrition(recipe);
            }
            return recipe;
        });
    }

    /**
     * Eğer varsa, belirtilen tarifin bekleyen güncellemesini döner.
     */
    @Transactional(readOnly = true)
    public Optional<Recipe> findPendingUpdate(Long parentId) {
        return recipeRepository.findByParentIdAndStatus(parentId, RecipeStatus.PENDING);
    }

    /**
     * Tarifi soft delete ile pasif duruma getirir.
     */
    @Transactional
    public void deleteById(Long id) {
        recipeRepository.deleteById(id);
    }

    /**
     * Tüm tarifleri malzemeleriyle birlikte getirir ve eksik hesaplamaları tamamlar.
     * Güvenlik filtresi olmadan getirir, genellikle internal kullanım içindir.
     */
    @Transactional
    public Recipe save(Recipe recipe) {
        return recipeRepository.save(recipe);
    }

    public List<Recipe> findAll() {
        List<Recipe> recipes = recipeRepository.findAll();
        recipes.forEach(recipe -> {
            if (recipe.getTotalCalories() == null || recipe.getTotalCalories() == 0) {
                calculateAndSetNutrition(recipe);
            }
        });
        return recipes;
    }

    /**
     * Sayfalanmış tarif listesini getirir ve eksik hesaplamaları tamamlar.
     */
    @Transactional
    public Page<Recipe> findAll(String userId, Pageable pageable) {
        Page<Recipe> recipes = recipeRepository.findAllActive(userId, pageable);
        recipes.forEach(recipe -> {
            if (recipe.getTotalCalories() == null || recipe.getTotalCalories() == 0) {
                calculateAndSetNutrition(recipe);
            }
        });
        return recipes;
    }

    /**
     * Başlığa göre sayfalanmış arama yapar.
     */
    @Transactional
    public Page<Recipe> searchByTitle(String title, String userId, Pageable pageable) {
        Page<Recipe> recipes = recipeRepository.findByTitleContainingIgnoreCase(title, userId, pageable);
        recipes.forEach(recipe -> {
            if (recipe.getTotalCalories() == null || recipe.getTotalCalories() == 0) {
                calculateAndSetNutrition(recipe);
            }
        });
        return recipes;
    }

    /**
     * Verilen malzemeleri içeren tarifleri filtreler.
     */
    public List<Recipe> findByIngredients(List<String> ingredientNames) {
        return recipeRepository.findByIngredientNamesIn(ingredientNames);
    }

    /**
     * Bir tarifin kullanıcının diyet tipine ve alerjilerine uygunluğunu kontrol eder.
     */
    public boolean isCompatibleWithDiet(Recipe recipe, String dietType, List<String> userAllergies) {
        if (recipe == null) return false;

        // 1. Alerjen kontrolü
        if (userAllergies != null && !userAllergies.isEmpty() && recipe.getRecipeIngredients() != null) {
            boolean hasAllergen = recipe.getRecipeIngredients().stream()
                .anyMatch(ri -> ri.getIngredient() != null &&
                    userAllergies.stream().anyMatch(allergen ->
                        ri.getIngredient().getName().equalsIgnoreCase(allergen)));
            if (hasAllergen) return false;
        }

        // 2. Diyet tipi kontrolü
        if (dietType != null && !dietType.equals("NONE")) {
            if (dietType.equalsIgnoreCase("VEGAN")) {
                return isVeganFriendly(recipe);
            }
            if (dietType.equalsIgnoreCase("VEGETARIAN")) {
                return isVegetarianFriendly(recipe);
            }
        }

        return true;
    }

    private boolean isVeganFriendly(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null) return true;
        return recipe.getRecipeIngredients().stream()
            .noneMatch(ri -> isAnimalProduct(ri.getIngredient()));
    }

    private boolean isVegetarianFriendly(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null) return true;
        return recipe.getRecipeIngredients().stream()
            .noneMatch(ri -> isMeatProduct(ri.getIngredient()));
    }

    private boolean isAnimalProduct(Ingredient ingredient) {
        if (ingredient == null) return false;
        Ingredient.Category cat = ingredient.getCategory();
        return cat == Ingredient.Category.MEAT ||
            cat == Ingredient.Category.DAIRY ||
            cat == Ingredient.Category.EGG ||
            cat == Ingredient.Category.SEAFOOD;
    }

    private boolean isMeatProduct(Ingredient ingredient) {
        if (ingredient == null) return false;
        Ingredient.Category cat = ingredient.getCategory();
        return cat == Ingredient.Category.MEAT ||
            cat == Ingredient.Category.SEAFOOD;
    }
}