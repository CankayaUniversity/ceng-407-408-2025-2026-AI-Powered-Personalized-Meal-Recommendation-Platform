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
     * Yeni bir tarif oluşturur. Kullanıcı oluşturuyorsa statüsü DRAFT veya PENDING olabilir.
     */
    @Transactional
    public Recipe createRecipe(Recipe recipe, List<RecipeIngredient> ingredients) {
        if (recipe.getStatus() == null) {
            recipe.setStatus(RecipeStatus.DRAFT);
        }
        if (recipe.getVersionNumber() == null) {
            recipe.setVersionNumber(1);
        }
        recipe.setActive(true);
        Recipe savedRecipe = recipeRepository.save(recipe);

        if (ingredients != null) {
            setupIngredients(savedRecipe, ingredients);
        }

        calculateAndSetNutrition(savedRecipe);

        if (savedRecipe.getStatus() == RecipeStatus.PENDING) {
            notifyAdminsForApproval(savedRecipe);
        }

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

        RecipeStatus requestedStatus = updatedData.getStatus() != null ? updatedData.getStatus() : RecipeStatus.PENDING;
        boolean shouldCreateNewRevision = existing.getStatus() == RecipeStatus.APPROVED
            || (existing.getParentId() != null && requestedStatus == RecipeStatus.PENDING
                && (existing.getStatus() == RecipeStatus.PENDING || existing.getStatus() == RecipeStatus.REJECTED || existing.getStatus() == RecipeStatus.SUPERSEDED));

        if (shouldCreateNewRevision) {
            Recipe savedRevision = createRevision(existing, updatedData, ingredients, userId, requestedStatus);
            if (savedRevision.getStatus() == RecipeStatus.PENDING) {
                notifyAdminsForApproval(savedRevision);
            }
            return savedRevision;
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
        } else if (existing.getStatus() == RecipeStatus.REJECTED) {
            existing.setStatus(RecipeStatus.DRAFT);
        }

        if (ingredients != null) {
            if (existing.getRecipeIngredients() != null) {
                existing.getRecipeIngredients().clear();
                recipeRepository.saveAndFlush(existing);
            }
            setupIngredients(existing, ingredients);
        }

        calculateAndSetNutrition(existing);
        Recipe saved = recipeRepository.save(existing);
        
        if (saved.getStatus() == RecipeStatus.PENDING) {
            notifyAdminsForApproval(saved);
        }
        
        return saved;
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
            if (recipe.getParentId() != null) {
                supersedePendingRevisions(recipe.getParentId());
            }
            recipe.setStatus(RecipeStatus.PENDING);
            recipeRepository.save(recipe);
            notifyAdminsForApproval(recipe);
        }
    }

    private void notifyAdminsForApproval(Recipe recipe) {
        List<User> admins = Optional.ofNullable(userRepository.findAllAdmins()).orElse(List.of());
        log.info("Tarif onayı için adminler bilgilendiriliyor. Bulunan admin sayısı: {}", admins.size());
        
        String title = "Yeni Tarif Onay Bekliyor";
        String message = recipe.getTitle() + " başlıklı tarif onayınızı bekliyor.";
        
        for (User admin : admins) {
            Notification n = notificationService.createNotification(
                admin, 
                title, 
                message, 
                Notification.NotificationType.RECIPE_APPROVAL, 
                recipe.getId().toString()
            );
            if (n != null) {
                log.debug("Admin {} için bildirim oluşturuldu: {}", admin.getEmail(), n.getId());
            } else {
                log.debug("Admin {} için zaten okunmamış onay bildirimi var, yeni bildirim oluşturulmadı.", admin.getEmail());
            }
        }
    }

    private Recipe createRevision(Recipe source, Recipe updatedData, List<RecipeIngredient> ingredients, String userId, RecipeStatus targetStatus) {
        Long rootId = resolveRootId(source);
        if (targetStatus == RecipeStatus.PENDING) {
            supersedePendingRevisions(rootId);
        }

        Recipe revision = new Recipe();
        revision.setParentId(rootId);
        revision.setVersionNumber(nextVersionNumber(rootId));
        revision.setCreatedBy(userId);
        revision.setStatus(targetStatus);
        revision.setActive(true);

        applyRecipeFields(revision, source, updatedData);
        revision.setAverageRating(source.getAverageRating());
        revision.setRatingCount(source.getRatingCount());
        revision.setTotalCookCount(source.getTotalCookCount());

        Recipe savedRevision = recipeRepository.save(revision);
        if (ingredients != null) {
            setupIngredients(savedRevision, ingredients);
        } else if (source.getRecipeIngredients() != null) {
            setupIngredients(savedRevision, cloneIngredients(source.getRecipeIngredients()));
        }

        calculateAndSetNutrition(savedRevision);
        return recipeRepository.save(savedRevision);
    }

    private void applyRecipeFields(Recipe target, Recipe source, Recipe updatedData) {
        target.setTitle(updatedData.getTitle() != null ? updatedData.getTitle() : source.getTitle());
        target.setInstructions(updatedData.getInstructions() != null ? updatedData.getInstructions() : source.getInstructions());
        target.setPreparationTimeMinutes(updatedData.getPreparationTimeMinutes() != null ? updatedData.getPreparationTimeMinutes() : source.getPreparationTimeMinutes());
        target.setServings(updatedData.getServings() != null ? updatedData.getServings() : source.getServings());
        target.setDifficulty(updatedData.getDifficulty() != null ? updatedData.getDifficulty() : source.getDifficulty());
        target.setCategory(updatedData.getCategory() != null ? updatedData.getCategory() : source.getCategory());
        target.setImageUrl(updatedData.getImageUrl() != null ? updatedData.getImageUrl() : source.getImageUrl());
    }

    private List<RecipeIngredient> cloneIngredients(List<RecipeIngredient> ingredients) {
        return ingredients.stream()
            .map(ri -> RecipeIngredient.builder()
                .ingredient(ri.getIngredient())
                .amount(ri.getAmount())
                .unit(ri.getUnit())
                .grams(ri.getGrams())
                .build())
            .toList();
    }

    private void supersedePendingRevisions(Long rootId) {
        List<Recipe> pendingRevisions = recipeRepository.findByParentIdAndStatusAndActiveTrue(rootId, RecipeStatus.PENDING);
        if (pendingRevisions == null || pendingRevisions.isEmpty()) {
            return;
        }
        pendingRevisions.forEach(revision -> revision.setStatus(RecipeStatus.SUPERSEDED));
        recipeRepository.saveAll(pendingRevisions);
    }

    private int nextVersionNumber(Long rootId) {
        Integer currentMax = recipeRepository.findMaxVersionNumber(rootId);
        return (currentMax != null ? currentMax : 1) + 1;
    }

    private Long resolveRootId(Recipe recipe) {
        return recipe.getParentId() != null ? recipe.getParentId() : recipe.getId();
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
            if (ingredient == null && recipe.getStatus() == RecipeStatus.APPROVED) {
                 // Eğer malzeme yoksa, bu ingredient kaydını DB'ye eklemeyebiliriz veya hata verebiliriz.
                 // Mevcut tabloda ingredient_id nullable=false olduğu için bir dummy veya hata şart.
                 // Şimdilik hata vermeye devam edelim ama sadece APPROVED için.
                 throw new RuntimeException("Onaylı tarifler için geçerli malzeme veritabanında kayıtlı olmalıdır.");
            }
            
            // PENDING (Onay Bekleyen) tariflerde malzeme yoksa, isminden bulmaya çalışıyoruz. 
            // Eğer isimle de bulunamazsa (yeni malzeme), DB kısıtı (nullable=false) nedeniyle
            // bir şekilde halledilmesi lazım. Ancak mevcut durumda UI'dan gelen malzeme listede yoksa hata veriyor.
            // Taslak ve Onay Bekleyenlerde malzeme null olabilirse DB şeması değişmeli.
            // Şimdilik PENDING için de hata vermeyi kaldırıyoruz (veya daha esnek yapıyoruz).
            if (ingredient == null && recipe.getStatus() == RecipeStatus.PENDING) {
                log.warn("Onay bekleyen tarifte malzeme bulunamadı. Malzeme adı: {}", 
                    ri.getIngredient() != null ? ri.getIngredient().getName() : "Bilinmiyor");
                // Not: Eğer DB'de ingredient_id NOT NULL ise bu yine de hata verecektir.
                // Ama RuntimeException fırlatmak yerine Hibernate'in hata vermesine izin veriyoruz 
                // veya ileride buraya otomatik malzeme ekleme mantığı gelebilir.
            }
            
            // Zorunlu alanları kontrol et (NULL ise varsayılan ata)
            if (ri.getAmount() == null) ri.setAmount(0.0);
            if (ri.getUnit() == null) ri.setUnit("adet");
            
            // Eğer grams doğrudan verilmişse (frontend'den), hesaplamaya gerek yok veya sadece grams'ı set et
            if (ri.getGrams() == null || ri.getGrams() == 0.0) {
                if (ingredient != null) {
                    Double grams = unitConverterService.convertToGrams(ri.getAmount(), ri.getUnit(), ingredient);
                    ri.setGrams(grams);
                } else {
                    ri.setGrams(0.0);
                }
            } else if (ingredient != null && (ri.getGrams().equals(ri.getAmount()) && !"gram".equalsIgnoreCase(ri.getUnit()) && !"g".equalsIgnoreCase(ri.getUnit()))) {
                // Eğer amount ve grams eşitse ama birim gram değilse, muhtemelen hatalı veridir, yeniden hesapla
                Double grams = unitConverterService.convertToGrams(ri.getAmount(), ri.getUnit(), ingredient);
                ri.setGrams(grams);
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

        if (recipe.getStatus() != RecipeStatus.PENDING) {
            throw new RuntimeException("Sadece onay bekleyen tarifler onaylanabilir.");
        }
        
        if (recipe.getParentId() != null) {
            Recipe original = recipeRepository.findById(recipe.getParentId())
                .orElseThrow(() -> new RuntimeException("Orijinal tarif bulunamadı: " + recipe.getParentId()));
            
            // Verileri kopyala
            original.setTitle(recipe.getTitle());
            original.setInstructions(recipe.getInstructions());
            original.setPreparationTimeMinutes(recipe.getPreparationTimeMinutes());
            original.setServings(recipe.getServings());
            original.setDifficulty(recipe.getDifficulty());
            original.setCategory(recipe.getCategory());
            original.setImageUrl(recipe.getImageUrl());
            original.setTotalCalories(recipe.getTotalCalories());
            original.setTotalProtein(recipe.getTotalProtein());
            original.setTotalCarbs(recipe.getTotalCarbs());
            original.setTotalFat(recipe.getTotalFat());
            original.setVersionNumber(recipe.getVersionNumber());

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
            
            // Geçici güncellemeyi silmek yerine pasife çekiyoruz (soft-delete)
            // Böylece bildirimlerden gelen linkler kırılmaz
            recipe.setActive(false);
            recipe.setStatus(RecipeStatus.APPROVED); // Onaylandığını belirtmek için
            recipeRepository.save(recipe);
            
            // Bildirimleri güncelle
            notificationService.updateNotificationsForTarget(
                recipeId.toString(), 
                Notification.NotificationType.RECIPE_APPROVAL,
                "Tarif Güncellemesi Onaylandı",
                original.getTitle() + " için gönderdiğiniz güncelleme isteği onaylandı ve yayınlandı.",
                original.getId().toString()
            );
        } else {
            recipe.setStatus(RecipeStatus.APPROVED);
            recipeRepository.save(recipe);
            
            // Bildirimleri güncelle
            notificationService.updateNotificationsForTarget(
                recipeId.toString(), 
                Notification.NotificationType.RECIPE_APPROVAL,
                "Tarif Onaylandı",
                recipe.getTitle() + " başlıklı tarif onaylandı ve yayınlandı.",
                null
            );
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

        // Bildirimleri güncelle
        notificationService.updateNotificationsForTarget(
            recipeId.toString(), 
            Notification.NotificationType.RECIPE_APPROVAL,
            "Tarif Reddedildi",
            recipe.getTitle() + " başlıklı tarif isteği reddedildi.",
            null
        );
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
            Recipe updatedData = Recipe.builder()
                .imageUrl(uploadedFileName)
                .build();
            Recipe pendingUpdate = createRevision(recipe, updatedData, null, userId, RecipeStatus.PENDING);
            notifyAdminsForApproval(pendingUpdate);
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
                // İlişki kopukluğunu önlemek için set et
                if (ri.getRecipe() == null) {
                    ri.setRecipe(recipe);
                }

                // 1. ADIM: Gramaj Senkronizasyonu (JIT Calculation)
                if ((ri.getGrams() == null || ri.getGrams() <= 0) && ri.getAmount() != null) {
                    Double calculatedGrams = unitConverterService.convertToGrams(
                        ri.getAmount(),
                        ri.getUnit(),
                        ri.getIngredient()
                    );
                    ri.setGrams(calculatedGrams != null ? calculatedGrams : 0.0);
                } else if (ri.getGrams() == null) {
                    ri.setGrams(0.0);
                }

                // 2. ADIM: Güncel gramaj üzerinden besin değerlerini hesapla
                if (ri.getIngredient() != null && ri.getIngredient().getNutrition() != null && ri.getGrams() > 0) {
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

        // Not: @Transactional olduğu için manuel save'e gerek yok, 
        // ancak metodun çağrıldığı yerlere bağlı olarak flush garantiye alınabilir.
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
            // Eğer aktif değilse ve admin değilse veya sahibi değilse erişimi kısıtlayabiliriz
            // Ancak şimdilik bildirimlerden gelen erişim için izin veriyoruz
            if (recipe.getTotalCalories() == null || recipe.getTotalCalories() == 0) {
                calculateAndSetNutrition(recipe);
            }
            return recipe;
        });
    }

    /**
     * Sadece aktif tarifleri ID'ye göre getirir.
     */
    @Transactional(readOnly = true)
    public Optional<Recipe> findActiveById(Long id) {
        return recipeRepository.findActiveByIdWithIngredients(id);
    }

    /**
     * Eğer varsa, belirtilen tarifin bekleyen güncellemesini döner.
     */
    @Transactional(readOnly = true)
    public Optional<Recipe> findPendingUpdate(Long parentId) {
        return recipeRepository.findByParentIdAndStatus(parentId, RecipeStatus.PENDING);
    }

    /**
     * Kullanıcının ana tarif üzerinde gördüğü en güncel yerel revizyonu döner.
     */
    @Transactional(readOnly = true)
    public Optional<Recipe> findLatestUserRevision(Long parentId, String userId) {
        if (userId == null || userId.isBlank()) {
            return Optional.empty();
        }
        return recipeRepository.findFirstByParentIdAndCreatedByAndStatusInAndActiveTrueOrderByVersionNumberDescCreatedAtDesc(
            parentId,
            userId,
            List.of(RecipeStatus.PENDING, RecipeStatus.DRAFT, RecipeStatus.REJECTED)
        );
    }

    /**
     * Tarifi soft delete ile pasif duruma getirir.
     */
    @Transactional
    public List<Recipe> findAllVersions(Long id, String userId, boolean isAdmin) {
        Recipe recipe = recipeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Tarif bulunamadı"));
        
        // Eğer parentId varsa o bir versiyondur, root tarifin id'sini bulmalıyız
        Long rootId = recipe.getParentId() != null ? recipe.getParentId() : recipe.getId();
        
        return recipeRepository.findAllVersions(rootId, userId, isAdmin);
    }

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
