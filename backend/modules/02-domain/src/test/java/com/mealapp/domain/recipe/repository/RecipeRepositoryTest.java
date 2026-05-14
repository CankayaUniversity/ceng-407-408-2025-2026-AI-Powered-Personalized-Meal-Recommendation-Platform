package com.mealapp.domain.recipe.repository;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeFavorite;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.entity.RecipeStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Testcontainers
@Tag("integration")
class RecipeRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestEntityManager em;

    @Autowired
    private RecipeRepository recipeRepository;

    @Autowired
    private RecipeFavoriteRepository favoriteRepository;

    private static final String USER1 = "user1";
    private static final String USER2 = "user2";
    private static final Pageable PAGE = PageRequest.of(0, 20);

    // Persisted test recipes (re-created each test via @BeforeEach)
    private Recipe approvedMain;       // APPROVED root, category=main
    private Recipe approvedBreakfast;  // APPROVED root, category=breakfast
    private Recipe user1DraftMain;     // DRAFT root, createdBy=user1, category=main
    private Recipe user1PendingRevision; // PENDING revision of approvedMain, createdBy=user1
    private Recipe supersededRevision; // SUPERSEDED revision, createdBy=user1 — must NOT appear
    private Recipe inactiveRecipe;     // active=false — must NOT appear
    private Recipe user2DraftMain;     // DRAFT root, createdBy=user2 — NOT visible to user1

    @BeforeEach
    void setUp() {
        favoriteRepository.deleteAllInBatch();
        recipeRepository.deleteAllInBatch();
        em.flush();

        approvedMain = persist(recipe("Approved Main Pizza", "main", RecipeStatus.APPROVED, null, null, true));
        approvedBreakfast = persist(recipe("Approved Breakfast Eggs", "breakfast", RecipeStatus.APPROVED, null, null, true));
        user1DraftMain = persist(recipe("User1 Draft Main", "main", RecipeStatus.DRAFT, USER1, null, true));

        // Revision of approvedMain
        user1PendingRevision = persist(recipe("Approved Main Pizza Revision", "main", RecipeStatus.PENDING, USER1, approvedMain.getId(), true));

        // Superseded revision — must not appear even for user1
        supersededRevision = persist(recipe("Superseded Revision", "main", RecipeStatus.SUPERSEDED, USER1, approvedMain.getId(), true));

        // Inactive root recipe — must not appear
        inactiveRecipe = persist(recipe("Inactive Main", "main", RecipeStatus.APPROVED, null, null, false));

        // Another user's draft — not visible to user1
        user2DraftMain = persist(recipe("User2 Draft Main", "main", RecipeStatus.DRAFT, USER2, null, true));

        em.flush();
        em.clear();
    }

    // ---- findAllActiveByCategory ----

    @Test
    void findAllActiveByCategory_returnsOnlyMatchingCategory() {
        Page<Recipe> result = recipeRepository.findAllActiveByCategory(USER1, "main", PAGE);

        // approvedMain excluded: user1 has an active non-superseded revision for it (dedup rule)
        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .containsExactlyInAnyOrder(
                        user1DraftMain.getId(),
                        user1PendingRevision.getId()
                )
                .doesNotContain(
                        approvedMain.getId(),          // has user1's revision — dedup hides root
                        approvedBreakfast.getId(),     // wrong category
                        supersededRevision.getId(),    // SUPERSEDED
                        inactiveRecipe.getId(),        // inactive
                        user2DraftMain.getId()         // other user's draft
                );
    }

    @Test
    void findAllActiveByCategory_breakfastReturnsOnlyBreakfast() {
        Page<Recipe> result = recipeRepository.findAllActiveByCategory(USER1, "breakfast", PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .containsExactly(approvedBreakfast.getId());
    }

    @Test
    void findAllActiveByCategory_countQueryMatchesContent() {
        // After dedup: user1 sees user1DraftMain + user1PendingRevision = 2 results for "main"
        Page<Recipe> result = recipeRepository.findAllActiveByCategory(USER1, "main", PageRequest.of(0, 2));

        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(2);
        assertThat(result.getContent()).hasSize(2);
    }

    // ---- findByTitleAndCategory ----

    @Test
    void findByTitleAndCategory_matchesTitleAndCategory() {
        Page<Recipe> result = recipeRepository.findByTitleAndCategory("pizza", "main", USER1, PAGE);

        // approvedMain excluded by dedup (user1 has a pending revision for it)
        // user1PendingRevision title contains "pizza" and category is "main"
        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .contains(user1PendingRevision.getId())
                .doesNotContain(approvedMain.getId(),    // dedup: root hidden when revision exists
                                user1DraftMain.getId()); // title doesn't contain "pizza"
    }

    @Test
    void findByTitleAndCategory_titleMatchInWrongCategoryReturnsEmpty() {
        // "eggs" matches approvedBreakfast but category filter is "main"
        Page<Recipe> result = recipeRepository.findByTitleAndCategory("eggs", "main", USER1, PAGE);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void findByTitleAndCategory_supersededNotReturned() {
        Page<Recipe> result = recipeRepository.findByTitleAndCategory("superseded", "main", USER1, PAGE);

        assertThat(result.getContent()).isEmpty();
    }

    // ---- findAllFavoritesByUserId ----

    @Test
    void findAllFavoritesByUserId_returnsOnlyCurrentUserFavorites() {
        favorite(USER1, approvedMain);
        favorite(USER1, approvedBreakfast);
        favorite(USER2, approvedMain); // same recipe, different user
        em.flush();
        em.clear();

        Page<Recipe> user1Result = recipeRepository.findAllFavoritesByUserId(USER1, PAGE);
        Page<Recipe> user2Result = recipeRepository.findAllFavoritesByUserId(USER2, PAGE);

        assertThat(user1Result.getContent())
                .extracting(Recipe::getId)
                .containsExactlyInAnyOrder(user1PendingRevision.getId(), approvedBreakfast.getId())
                .doesNotContain(approvedMain.getId());

        assertThat(user2Result.getContent())
                .extracting(Recipe::getId)
                .containsExactly(approvedMain.getId());
    }

    @Test
    void findAllFavoritesByUserId_inactiveRecipeNotReturned() {
        favorite(USER1, inactiveRecipe);
        em.flush();
        em.clear();

        Page<Recipe> result = recipeRepository.findAllFavoritesByUserId(USER1, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .doesNotContain(inactiveRecipe.getId());
    }

    @Test
    void findAllFavoritesByUserId_supersededRevisionNotReturned() {
        favorite(USER1, supersededRevision);
        em.flush();
        em.clear();

        Page<Recipe> result = recipeRepository.findAllFavoritesByUserId(USER1, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .doesNotContain(supersededRevision.getId());
    }

    @Test
    void findAllFavoritesByUserId_otherUsersDraftNotVisibleViaFavorites() {
        // user1 favorites user2's draft — but visibility rule blocks it
        favorite(USER1, user2DraftMain);
        em.flush();
        em.clear();

        Page<Recipe> result = recipeRepository.findAllFavoritesByUserId(USER1, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .doesNotContain(user2DraftMain.getId());
    }

    @Test
    void findAllFavoritesByUserId_countQueryPaginationConsistent() {
        favorite(USER1, approvedMain);
        favorite(USER1, approvedBreakfast);
        em.flush();
        em.clear();

        Page<Recipe> page1 = recipeRepository.findAllFavoritesByUserId(USER1, PageRequest.of(0, 1));

        assertThat(page1.getTotalElements()).isEqualTo(2);
        assertThat(page1.getContent()).hasSize(1);
        assertThat(page1.getTotalPages()).isEqualTo(2);
    }

    // ---- findFavoritesByTitleAndUserId ----

    @Test
    void findFavoritesByTitleAndUserId_matchesTitleWithinFavorites() {
        favorite(USER1, approvedMain);
        favorite(USER1, approvedBreakfast);
        em.flush();
        em.clear();

        Page<Recipe> result = recipeRepository.findFavoritesByTitleAndUserId("pizza", USER1, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .containsExactly(user1PendingRevision.getId())
                .doesNotContain(approvedMain.getId());
    }

    @Test
    void findFavoritesByTitleAndUserId_titleNotInFavoritesReturnsEmpty() {
        favorite(USER1, approvedBreakfast); // user1 favors breakfast only
        em.flush();
        em.clear();

        Page<Recipe> result = recipeRepository.findFavoritesByTitleAndUserId("pizza", USER1, PAGE);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void findFavoritesByTitleAndUserId_user2FavoritesDoNotLeakToUser1() {
        favorite(USER2, approvedMain);
        em.flush();
        em.clear();

        Page<Recipe> result = recipeRepository.findFavoritesByTitleAndUserId("pizza", USER1, PAGE);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    void findAllFavoritesByUserId_dedupsFavoritedRecipeFamily() {
        favorite(USER1, approvedMain);
        favorite(USER1, user1PendingRevision);
        em.flush();
        em.clear();

        Page<Recipe> result = recipeRepository.findAllFavoritesByUserId(USER1, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .containsExactly(user1PendingRevision.getId())
                .doesNotContain(approvedMain.getId());
    }

    // ---- dedup (per-family one card) ----

    @Test
    void findAllActive_usesVersionNumberBeforeIdWhenChoosingLatestRevision() {
        Recipe existingRevision = em.find(Recipe.class, user1PendingRevision.getId());
        existingRevision.setVersionNumber(5);

        Recipe user1DraftRevision = recipe("Approved Main Pizza Draft", "main", RecipeStatus.DRAFT, USER1, approvedMain.getId(), true);
        user1DraftRevision.setVersionNumber(2);
        persist(user1DraftRevision);
        em.flush();
        em.clear();

        Page<Recipe> result = recipeRepository.findAllActive(USER1, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .contains(user1PendingRevision.getId())
                .doesNotContain(user1DraftRevision.getId(), approvedMain.getId());
    }

    @Test
    void findAllActive_usesIdAsFinalTieBreakerWhenVersionAndCreatedAtMatch() {
        Recipe firstRevision = em.find(Recipe.class, user1PendingRevision.getId());
        firstRevision.setVersionNumber(7);

        Recipe secondRevision = recipe("Approved Main Pizza Tie Breaker", "main", RecipeStatus.DRAFT, USER1, approvedMain.getId(), true);
        secondRevision.setVersionNumber(7);
        persist(secondRevision);
        em.flush();

        em.getEntityManager()
                .createNativeQuery("UPDATE recipes SET created_at = TIMESTAMP '2026-01-01 00:00:00' WHERE id IN (?, ?)")
                .setParameter(1, firstRevision.getId())
                .setParameter(2, secondRevision.getId())
                .executeUpdate();
        em.clear();

        Page<Recipe> result = recipeRepository.findAllActive(USER1, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .contains(secondRevision.getId())
                .doesNotContain(firstRevision.getId(), approvedMain.getId());
    }

    @Test
    void findAllActive_dedupExcludesRootWhenUserHasActiveRevision() {
        // user1 has user1PendingRevision (parentId=approvedMain) — root must not appear for user1
        Page<Recipe> result = recipeRepository.findAllActive(USER1, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .doesNotContain(approvedMain.getId())
                .contains(user1PendingRevision.getId());
    }

    @Test
    void findAllActive_rootVisibleToOtherUserWithNoRevision() {
        // user2 has no revision for approvedMain — root must appear for user2
        Page<Recipe> result = recipeRepository.findAllActive(USER2, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .contains(approvedMain.getId());
    }

    @Test
    void findAllActive_rootAppearsAfterAllRevisionsSuperseded() {
        // supersededRevision is SUPERSEDED → should not block root from appearing
        // user2 viewpoint: approvedMain visible, supersededRevision not visible
        Page<Recipe> result = recipeRepository.findAllActive(USER2, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .contains(approvedMain.getId())
                .doesNotContain(supersededRevision.getId());
    }

    @Test
    void findByTitleContainingIgnoreCase_dedupExcludesRootWhenUserHasRevision() {
        // "pizza" matches approvedMain AND user1PendingRevision; user1 should see only revision
        Page<Recipe> result = recipeRepository.findByTitleContainingIgnoreCase("pizza", USER1, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .contains(user1PendingRevision.getId())
                .doesNotContain(approvedMain.getId());
    }

    @Test
    void findByTitleContainingIgnoreCase_rootVisibleWhenNoRevision() {
        // user2 has no revision for approvedMain — root must appear in search
        Page<Recipe> result = recipeRepository.findByTitleContainingIgnoreCase("pizza", USER2, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .contains(approvedMain.getId());
    }

    @Test
    void findAllActiveByCategory_rootVisibleToOtherUserWithNoRevision() {
        // user2 has no revision for approvedMain — root must appear in category filter
        Page<Recipe> result = recipeRepository.findAllActiveByCategory(USER2, "main", PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .contains(approvedMain.getId());
    }

    @Test
    void findTopRecipesSafeForUser_dedupsRecipeFamily() {
        Ingredient tomato = em.persist(Ingredient.builder()
                .name("Tomato")
                .category(Ingredient.Category.VEGETABLE)
                .build());
        recipeIngredient(approvedMain, tomato);
        recipeIngredient(user1PendingRevision, tomato);
        em.flush();
        em.clear();

        List<Recipe> result = recipeRepository.findTopRecipesSafeForUser(
                USER1,
                "NONE",
                List.of("Peanut"),
                PAGE
        );

        assertThat(result)
                .extracting(Recipe::getId)
                .contains(user1PendingRevision.getId())
                .doesNotContain(approvedMain.getId());
    }

    // ---- helpers ----

    private Recipe persist(Recipe recipe) {
        return em.persist(recipe);
    }

    private void favorite(String userId, Recipe recipe) {
        RecipeFavorite fav = RecipeFavorite.builder()
                .userId(userId)
                .recipe(recipe)
                .build();
        fav.setActive(true);
        em.persist(fav);
    }

    private void recipeIngredient(Recipe recipe, Ingredient ingredient) {
        em.persist(RecipeIngredient.builder()
                .recipe(recipe)
                .ingredient(ingredient)
                .amount(100.0)
                .unit("GRAM")
                .grams(100.0)
                .build());
    }

    private static Recipe recipe(String title, String category, RecipeStatus status,
                                  String createdBy, Long parentId, boolean active) {
        Recipe r = Recipe.builder()
                .title(title)
                .category(category)
                .status(status)
                .createdBy(createdBy)
                .parentId(parentId)
                .build();
        r.setActive(active);
        return r;
    }
}
