package com.mealapp.domain.recipe.repository;

import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeFavorite;
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

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .containsExactlyInAnyOrder(
                        approvedMain.getId(),
                        user1DraftMain.getId(),
                        user1PendingRevision.getId()
                )
                .doesNotContain(
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
        Page<Recipe> result = recipeRepository.findAllActiveByCategory(USER1, "main", PageRequest.of(0, 2));

        assertThat(result.getTotalElements()).isGreaterThanOrEqualTo(3);
        assertThat(result.getContent()).hasSize(2);
    }

    // ---- findByTitleAndCategory ----

    @Test
    void findByTitleAndCategory_matchesTitleAndCategory() {
        Page<Recipe> result = recipeRepository.findByTitleAndCategory("pizza", "main", USER1, PAGE);

        assertThat(result.getContent())
                .extracting(Recipe::getId)
                .contains(approvedMain.getId(), user1PendingRevision.getId())
                .doesNotContain(user1DraftMain.getId()); // title doesn't contain "pizza"
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
                .containsExactlyInAnyOrder(approvedMain.getId(), approvedBreakfast.getId());

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
                .containsExactly(approvedMain.getId());
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
