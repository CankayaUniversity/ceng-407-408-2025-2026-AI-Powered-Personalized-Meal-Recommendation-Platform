package com.mealapp.domain.recipe.service;

import com.mealapp.domain.notification.service.NotificationService;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.IngredientNutrition;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeCategory;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.recipe.entity.RecipeStatus;
import com.mealapp.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecipeServiceTest {

    @Mock
    private RecipeRepository recipeRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private UnitConverterService unitConverterService;

    @Mock
    private com.mealapp.domain.common.storage.FileStorageService fileStorageService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RecipeService recipeService;

    @Test
    void shouldCalculateNutritionWhenTotalCaloriesIsZero() {
        IngredientNutrition nutrition = IngredientNutrition.builder()
                .caloriesPer100g(200.0)
                .proteinPer100g(10.0)
                .carbsPer100g(20.0)
                .fatPer100g(5.0)
                .build();
        Ingredient ingredient = Ingredient.builder().name("Test").nutrition(nutrition).build();
        RecipeIngredient ri = RecipeIngredient.builder().ingredient(ingredient).grams(200.0).build();
        Recipe recipe = Recipe.builder().id(1L).recipeIngredients(List.of(ri)).totalCalories(0.0).build();

        when(recipeRepository.findByIdWithIngredients(1L)).thenReturn(Optional.of(recipe));
        
        Optional<Recipe> result = recipeService.findById(1L);
        
        assertEquals(400.0, result.get().getTotalCalories());
        assertEquals(20.0, result.get().getTotalProtein());
        assertEquals(40.0, result.get().getTotalCarbs());
        assertEquals(10.0, result.get().getTotalFat());
    }

    @Test
    void shouldFindAllWithIngredients() {
        when(recipeRepository.findAll()).thenReturn(List.of(new Recipe()));
        
        List<Recipe> result = recipeService.findAll();
        
        assertEquals(1, result.size());
    }

    @Test
    void findVisibleById_allowsOwnerDraftRevision() {
        Recipe revision = Recipe.builder()
            .id(25L)
            .parentId(10L)
            .title("Owner Draft")
            .createdBy("user1")
            .status(RecipeStatus.DRAFT)
            .totalCalories(10.0)
            .build();

        when(recipeRepository.findByIdWithIngredients(25L)).thenReturn(Optional.of(revision));

        Optional<Recipe> result = recipeService.findVisibleById(25L, "user1", false);

        assertTrue(result.isPresent());
        assertEquals(25L, result.get().getId());
    }

    @Test
    void findVisibleById_hidesOtherUsersDraftRevision() {
        Recipe revision = Recipe.builder()
            .id(25L)
            .parentId(10L)
            .title("Other Draft")
            .createdBy("user2")
            .status(RecipeStatus.DRAFT)
            .totalCalories(10.0)
            .build();

        when(recipeRepository.findByIdWithIngredients(25L)).thenReturn(Optional.of(revision));

        Optional<Recipe> result = recipeService.findVisibleById(25L, "user1", false);

        assertTrue(result.isEmpty());
    }

    @Test
    void updateRecipe_rejectsOtherUsersPrivateRevision() {
        Recipe revision = Recipe.builder()
            .id(25L)
            .parentId(10L)
            .title("Other Draft")
            .createdBy("user2")
            .status(RecipeStatus.DRAFT)
            .build();
        Recipe updatedData = Recipe.builder()
            .title("Hijack")
            .status(RecipeStatus.DRAFT)
            .build();

        when(recipeRepository.findById(25L)).thenReturn(Optional.of(revision));

        assertThrows(ResourceNotFoundException.class,
            () -> recipeService.updateRecipe(25L, updatedData, null, "user1"));
        verify(recipeRepository, never()).save(any(Recipe.class));
    }

    @Test
    void shouldUpdateRecipeWithIngredientId() {
        Long recipeId = 1L;
        String userId = "user123";
        Recipe existingRecipe = Recipe.builder()
            .id(recipeId)
            .title("Old Title")
            .createdBy(userId)
            .status(RecipeStatus.DRAFT)
            .build();

        Recipe updatedData = Recipe.builder()
            .title("New Title")
            .status(RecipeStatus.PENDING)
            .build();

        Ingredient ingredient = Ingredient.builder().id(10L).name("Tomato").build();
        RecipeIngredient ri = RecipeIngredient.builder()
            .ingredient(Ingredient.builder().id(10L).build())
            .amount(2.0)
            .unit("piece")
            .build();

        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existingRecipe));
        when(ingredientRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(ingredient));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Recipe result = recipeService.updateRecipe(recipeId, updatedData, List.of(ri), userId);

        assertNotNull(result);
        assertEquals("New Title", result.getTitle());
        assertEquals(RecipeStatus.PENDING, result.getStatus());
        assertEquals(1, result.getRecipeIngredients().size());
        assertEquals(10L, result.getRecipeIngredients().get(0).getIngredient().getId());
        verify(recipeRepository, org.mockito.Mockito.atLeastOnce()).save(any(Recipe.class));
    }

    @Test
    void updateRecipe_preservesManagedIngredientCollectionReference() {
        Long recipeId = 1L;
        String userId = "user123";
        Ingredient oldIngredient = Ingredient.builder().id(9L).name("Old Tomato").build();
        RecipeIngredient oldRi = RecipeIngredient.builder()
            .ingredient(oldIngredient)
            .amount(1.0)
            .unit("piece")
            .grams(50.0)
            .build();
        java.util.ArrayList<RecipeIngredient> managedIngredients = new java.util.ArrayList<>(List.of(oldRi));
        Recipe existingRecipe = Recipe.builder()
            .id(recipeId)
            .title("Old Title")
            .createdBy(userId)
            .status(RecipeStatus.DRAFT)
            .recipeIngredients(managedIngredients)
            .build();

        Recipe updatedData = Recipe.builder()
            .title("New Title")
            .status(RecipeStatus.DRAFT)
            .build();

        Ingredient newIngredient = Ingredient.builder().id(10L).name("New Tomato").build();
        RecipeIngredient newRi = RecipeIngredient.builder()
            .ingredient(Ingredient.builder().id(10L).build())
            .amount(2.0)
            .unit("piece")
            .grams(100.0)
            .build();

        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existingRecipe));
        when(ingredientRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(newIngredient));
        when(recipeRepository.saveAndFlush(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Recipe result = recipeService.updateRecipe(recipeId, updatedData, List.of(newRi), userId);

        assertSame(managedIngredients, result.getRecipeIngredients());
        assertEquals(1, result.getRecipeIngredients().size());
        assertEquals(10L, result.getRecipeIngredients().get(0).getIngredient().getId());
    }

    @Test
    void shouldUpdateRecipeWithEmptyIngredients() {
        Long recipeId = 1L;
        String userId = "user123";
        Recipe existingRecipe = Recipe.builder()
            .id(recipeId)
            .title("Old Title")
            .createdBy(userId)
            .status(RecipeStatus.DRAFT)
            .build();

        Recipe updatedData = Recipe.builder()
            .title("New Title")
            .instructions("New Instructions")
            .status(RecipeStatus.DRAFT)
            .build();

        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existingRecipe));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));
        // calculateAndSetNutrition calls findByIdWithIngredients if ingredients is empty
        when(recipeRepository.findByIdWithIngredients(recipeId)).thenReturn(Optional.of(existingRecipe));

        // Bu senaryoda ingredients listesi boş geliyor (sadece hazırlanış metni girilmiş gibi)
        Recipe result = recipeService.updateRecipe(recipeId, updatedData, List.of(), userId);

        assertNotNull(result);
        assertEquals("New Instructions", result.getInstructions());
        assertEquals(0, result.getRecipeIngredients().size());
        assertEquals(0.0, result.getTotalCalories());
        verify(recipeRepository, org.mockito.Mockito.atLeastOnce()).save(any(Recipe.class));
    }

    @Test
    void shouldCreatePendingUpdateFromApprovedRecipeWithMandatoryFields() {
        Long recipeId = 1L;
        String userId = "user123";
        Recipe existingRecipe = Recipe.builder()
            .id(recipeId)
            .title("Approved Title")
            .status(RecipeStatus.APPROVED)
            .averageRating(4.5)
            .ratingCount(10)
            .createdBy("anotherUser")
            .build();

        Recipe updatedData = Recipe.builder()
            .title("Proposed Change")
            .status(RecipeStatus.PENDING)
            .build();

        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existingRecipe));
        when(recipeRepository.findMaxVersionNumber(recipeId)).thenReturn(1);
        when(recipeRepository.findByParentIdAndStatusAndActiveTrue(recipeId, RecipeStatus.PENDING)).thenReturn(List.of());
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Recipe result = recipeService.updateRecipe(recipeId, updatedData, null, userId);

        assertNotNull(result);
        assertEquals(recipeId, result.getParentId());
        assertEquals(RecipeStatus.PENDING, result.getStatus());
        assertEquals(4.5, result.getAverageRating());
        assertEquals(10, result.getRatingCount());
        assertEquals(userId, result.getCreatedBy());
        assertEquals(true, result.isActive());
        assertEquals(2, result.getVersionNumber());
    }

    @Test
    void shouldCreateNewVersionAndSupersedeExistingPendingRevision() {
        Long recipeId = 1L;
        String userId = "user123";
        Recipe existingRecipe = Recipe.builder()
            .id(recipeId)
            .title("Approved Title")
            .status(RecipeStatus.APPROVED)
            .versionNumber(1)
            .createdBy("anotherUser")
            .build();
        Recipe existingPending = Recipe.builder()
            .id(2L)
            .parentId(recipeId)
            .title("Previous Pending")
            .status(RecipeStatus.PENDING)
            .versionNumber(2)
            .createdBy(userId)
            .build();
        existingPending.setActive(true);

        Recipe updatedData = Recipe.builder()
            .title("Second Proposed Change")
            .status(RecipeStatus.PENDING)
            .build();

        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existingRecipe));
        when(recipeRepository.findMaxVersionNumber(recipeId)).thenReturn(2);
        when(recipeRepository.findByParentIdAndStatusAndActiveTrue(recipeId, RecipeStatus.PENDING)).thenReturn(List.of(existingPending));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Recipe result = recipeService.updateRecipe(recipeId, updatedData, null, userId);

        assertEquals(RecipeStatus.SUPERSEDED, existingPending.getStatus());
        assertEquals(recipeId, result.getParentId());
        assertEquals(3, result.getVersionNumber());
        assertEquals(RecipeStatus.PENDING, result.getStatus());
        assertEquals("Second Proposed Change", result.getTitle());
        verify(recipeRepository).saveAll(List.of(existingPending));
    }

    @Test
    void sendToApproval_rootIdUsesUsersDraftRevision() {
        Long rootId = 1L;
        String userId = "user123";
        Recipe approvedRoot = Recipe.builder()
            .id(rootId)
            .title("Approved Title")
            .status(RecipeStatus.APPROVED)
            .createdBy("anotherUser")
            .build();
        approvedRoot.setActive(true);

        Recipe draftRevision = Recipe.builder()
            .id(2L)
            .parentId(rootId)
            .title("Draft Update")
            .status(RecipeStatus.DRAFT)
            .createdBy(userId)
            .build();
        draftRevision.setActive(true);

        when(recipeRepository.findById(rootId)).thenReturn(Optional.of(approvedRoot));
        when(recipeRepository.findUserRevisionsWithIngredients(eq(rootId), eq(userId), anyList(), any(Pageable.class)))
            .thenReturn(List.of(draftRevision));
        when(recipeRepository.findByParentIdAndCreatedByAndStatusInAndActiveTrue(eq(rootId), eq(userId), anyList()))
            .thenReturn(List.of(draftRevision));
        when(recipeRepository.findByParentIdAndStatusAndActiveTrue(rootId, RecipeStatus.PENDING)).thenReturn(List.of());
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        recipeService.sendToApproval(rootId, userId);

        assertEquals(RecipeStatus.PENDING, draftRevision.getStatus());
        verify(recipeRepository).save(draftRevision);
        verify(recipeRepository, never()).save(approvedRoot);
        verify(recipeRepository, never()).saveAll(anyList());
    }

    @Test
    void updateRecipe_draftRevisionCanBeSubmittedForApprovalWithoutCreatingAnotherRevision() {
        Long rootId = 1L;
        Long draftRevisionId = 2L;
        String userId = "user123";
        IngredientNutrition nutrition = IngredientNutrition.builder()
            .caloriesPer100g(20.0)
            .proteinPer100g(1.0)
            .carbsPer100g(4.0)
            .fatPer100g(0.5)
            .build();
        Ingredient tomato = Ingredient.builder()
            .id(10L)
            .name("Tomato")
            .nutrition(nutrition)
            .build();
        RecipeIngredient recipeIngredient = RecipeIngredient.builder()
            .ingredient(tomato)
            .amount(100.0)
            .unit("GRAM")
            .grams(100.0)
            .build();
        Recipe draftRevision = Recipe.builder()
            .id(draftRevisionId)
            .parentId(rootId)
            .title("Draft Update")
            .status(RecipeStatus.DRAFT)
            .createdBy(userId)
            .recipeIngredients(List.of(recipeIngredient))
            .build();
        draftRevision.setActive(true);
        Recipe olderDraftRevision = Recipe.builder()
            .id(3L)
            .parentId(rootId)
            .title("Older Draft Update")
            .status(RecipeStatus.DRAFT)
            .createdBy(userId)
            .build();
        olderDraftRevision.setActive(true);
        Recipe pendingRevisionFromAnotherUser = Recipe.builder()
            .id(4L)
            .parentId(rootId)
            .title("Other Pending Update")
            .status(RecipeStatus.PENDING)
            .createdBy("anotherUser")
            .build();
        pendingRevisionFromAnotherUser.setActive(true);

        Recipe updatedData = Recipe.builder()
            .title("Ready for Approval")
            .status(RecipeStatus.PENDING)
            .build();

        when(recipeRepository.findById(draftRevisionId)).thenReturn(Optional.of(draftRevision));
        when(recipeRepository.findByParentIdAndCreatedByAndStatusInAndActiveTrue(eq(rootId), eq(userId), anyList()))
            .thenReturn(List.of(draftRevision, olderDraftRevision));
        when(recipeRepository.findByParentIdAndStatusAndActiveTrue(rootId, RecipeStatus.PENDING))
            .thenReturn(List.of(pendingRevisionFromAnotherUser));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Recipe result = recipeService.updateRecipe(draftRevisionId, updatedData, null, userId);

        assertEquals(draftRevisionId, result.getId());
        assertEquals(rootId, result.getParentId());
        assertEquals(RecipeStatus.PENDING, result.getStatus());
        assertEquals("Ready for Approval", result.getTitle());
        assertEquals(RecipeStatus.SUPERSEDED, olderDraftRevision.getStatus());
        assertEquals(RecipeStatus.SUPERSEDED, pendingRevisionFromAnotherUser.getStatus());
        verify(recipeRepository, never()).findMaxVersionNumber(anyLong());
        verify(recipeRepository, times(2)).saveAll(anyList());
    }

    @Test
    void shouldNotThrowExceptionWhenIngredientNotFoundForPendingRecipe() {
        Long recipeId = 1L;
        String userId = "user123";
        Recipe existingRecipe = Recipe.builder()
            .id(recipeId)
            .title("Draft Title")
            .createdBy(userId)
            .status(RecipeStatus.DRAFT)
            .build();

        Recipe updatedData = Recipe.builder()
            .title("Update to Pending")
            .status(RecipeStatus.PENDING)
            .build();

        // Veritabanında olmayan bir malzeme gönderiyoruz
        RecipeIngredient ri = RecipeIngredient.builder()
            .ingredient(Ingredient.builder().name("Non Existent Ingredient").build())
            .amount(100.0)
            .unit("gram")
            .build();

        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existingRecipe));
        when(ingredientRepository.findByNameIgnoreCaseAndActiveTrue("Non Existent Ingredient")).thenReturn(Optional.empty());
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Hata fırlatmaması lazım (önceden RuntimeException fırlatıyordu)
        Recipe result = recipeService.updateRecipe(recipeId, updatedData, List.of(ri), userId);

        assertNotNull(result);
        assertEquals(RecipeStatus.PENDING, result.getStatus());
        assertEquals(1, result.getRecipeIngredients().size());
        org.junit.jupiter.api.Assertions.assertNull(result.getRecipeIngredients().get(0).getIngredient());
    }

    @Test
    void shouldAllowDuplicateIngredientsInRecipe() {
        Long recipeId = 1L;
        String userId = "user123";
        Recipe existingRecipe = Recipe.builder()
            .id(recipeId)
            .title("Draft Title")
            .createdBy(userId)
            .status(RecipeStatus.DRAFT)
            .recipeIngredients(new java.util.ArrayList<>())
            .build();

        Ingredient apple = Ingredient.builder().id(10L).name("Apple").build();

        // Aynı malzemeyi iki kez ekliyoruz
        RecipeIngredient ri1 = RecipeIngredient.builder()
            .ingredient(apple)
            .amount(1.0)
            .unit("piece")
            .build();
        RecipeIngredient ri2 = RecipeIngredient.builder()
            .ingredient(apple)
            .amount(200.0)
            .unit("gram")
            .build();

        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existingRecipe));
        when(ingredientRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(apple));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Recipe result = recipeService.updateRecipe(recipeId, existingRecipe, List.of(ri1, ri2), userId);

        assertNotNull(result);
        assertEquals(2, result.getRecipeIngredients().size());
        assertEquals(10L, result.getRecipeIngredients().get(0).getIngredient().getId());
        assertEquals(10L, result.getRecipeIngredients().get(1).getIngredient().getId());
    }

    @Test
    void shouldFindAllVersions() {
        Long rootId = 1L;
        String userId = "user1";
        Recipe root = Recipe.builder().id(rootId).status(RecipeStatus.APPROVED).totalCalories(10.0).build();
        
        when(recipeRepository.findByIdWithIngredients(rootId)).thenReturn(Optional.of(root));
        when(recipeRepository.findAllVersions(eq(rootId), eq(userId), anyBoolean())).thenReturn(List.of(root));

        List<Recipe> versions = recipeService.findAllVersions(rootId, userId, false);

        assertNotNull(versions);
        assertFalse(versions.isEmpty());
        verify(recipeRepository).findAllVersions(eq(rootId), eq(userId), eq(false));
    }

    // ---- findFiltered dispatch tests ----

    private Page<Recipe> emptyPage() {
        return new PageImpl<>(List.of());
    }

    @Test
    void findFiltered_noParams_callsFindAllActive() {
        Pageable p = PageRequest.of(0, 10);
        when(recipeRepository.findAllActive("u1", p)).thenReturn(emptyPage());

        recipeService.findFiltered("u1", null, null, false, p);

        verify(recipeRepository).findAllActive("u1", p);
        verifyNoMoreInteractions(recipeRepository);
    }

    @Test
    void findFiltered_titleOnly_callsFindByTitle() {
        Pageable p = PageRequest.of(0, 10);
        when(recipeRepository.findByTitleContainingIgnoreCase("pasta", "u1", p)).thenReturn(emptyPage());

        recipeService.findFiltered("u1", "pasta", null, false, p);

        verify(recipeRepository).findByTitleContainingIgnoreCase("pasta", "u1", p);
        verifyNoMoreInteractions(recipeRepository);
    }

    @Test
    void findFiltered_categoryOnly_callsFindAllActiveByCategory() {
        Pageable p = PageRequest.of(0, 10);
        when(recipeRepository.findAllActiveByCategory("u1", RecipeCategory.ANA_YEMEKLER, p)).thenReturn(emptyPage());

        recipeService.findFiltered("u1", null, "ANA_YEMEKLER", false, p);

        verify(recipeRepository).findAllActiveByCategory("u1", RecipeCategory.ANA_YEMEKLER, p);
        verifyNoMoreInteractions(recipeRepository);
    }

    @Test
    void findFiltered_titleAndCategory_callsFindByTitleAndCategory() {
        Pageable p = PageRequest.of(0, 10);
        when(recipeRepository.findByTitleAndCategory("pasta", RecipeCategory.ANA_YEMEKLER, "u1", p)).thenReturn(emptyPage());

        recipeService.findFiltered("u1", "pasta", "ANA_YEMEKLER", false, p);

        verify(recipeRepository).findByTitleAndCategory("pasta", RecipeCategory.ANA_YEMEKLER, "u1", p);
        verifyNoMoreInteractions(recipeRepository);
    }

    @Test
    void findFiltered_favoritesOnly_noTitle_callsFindAllFavorites() {
        Pageable p = PageRequest.of(0, 10);
        when(recipeRepository.findAllFavoritesByUserId("u1", p)).thenReturn(emptyPage());

        recipeService.findFiltered("u1", null, null, true, p);

        verify(recipeRepository).findAllFavoritesByUserId("u1", p);
        verifyNoMoreInteractions(recipeRepository);
    }

    @Test
    void findFiltered_favoritesOnly_withTitle_callsFindFavoritesByTitle() {
        Pageable p = PageRequest.of(0, 10);
        when(recipeRepository.findFavoritesByTitleAndUserId("soup", "u1", p)).thenReturn(emptyPage());

        recipeService.findFiltered("u1", "soup", null, true, p);

        verify(recipeRepository).findFavoritesByTitleAndUserId("soup", "u1", p);
        verifyNoMoreInteractions(recipeRepository);
    }

    @Test
    void findFiltered_favoritesOnly_nullUser_returnsEmptyPageWithoutRepoCall() {
        Pageable p = PageRequest.of(0, 10);

        Page<Recipe> result = recipeService.findFiltered(null, null, null, true, p);

        assertTrue(result.isEmpty());
        verifyNoInteractions(recipeRepository);
    }

    @Test
    void shouldNotifyAdminsWhenCreatingPendingRecipe() {
        Recipe recipe = Recipe.builder()
            .title("New Pending Recipe")
            .status(RecipeStatus.PENDING)
            .build();
        
        com.mealapp.domain.user.entity.User admin = new com.mealapp.domain.user.entity.User();
        admin.setEmail("admin@test.com");
        
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> {
            Recipe r = invocation.getArgument(0);
            r.setId(100L);
            return r;
        });
        when(userRepository.findAllAdmins()).thenReturn(List.of(admin));

        Recipe result = recipeService.createRecipe(recipe, null);

        assertNotNull(result);
        assertEquals(RecipeStatus.PENDING, result.getStatus());
        verify(notificationService).createNotification(
            eq(admin), 
            anyString(), 
            anyString(), 
            eq(com.mealapp.domain.notification.entity.Notification.NotificationType.RECIPE_APPROVAL), 
            eq("100")
        );
    }
}
