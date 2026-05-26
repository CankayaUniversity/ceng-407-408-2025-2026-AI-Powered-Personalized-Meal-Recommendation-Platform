package com.mealapp.domain.inventory.repository;

import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create",
        "spring.flyway.enabled=false"
})
@Testcontainers
@Tag("integration")
class InventoryRepositoryTest {

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
    private InventoryRepository inventoryRepository;

    private User user;
    private User otherUser;
    private InventoryGroup home;
    private InventoryGroup office;
    private InventoryGroup otherHome;
    private Ingredient rice;
    private Ingredient apple;
    private Ingredient milk;
    private Inventory homeRice;
    private Inventory homeApple;
    private Inventory officeRice;

    @BeforeEach
    void setUp() {
        user = persistUser("user-1", "user@example.com");
        otherUser = persistUser("user-2", "other@example.com");

        home = persistGroupForUser(user, "Home");
        office = persistGroupForUser(user, "Office");
        otherHome = persistGroupForUser(otherUser, "Other Home");

        rice = persistIngredient("Rice");
        apple = persistIngredient("Apple");
        milk = persistIngredient("Milk");

        homeRice = persistInventory(home, rice, 1000.0, "GRAM");
        homeApple = persistInventory(home, apple, 6.0, "PIECE");
        officeRice = persistInventory(office, rice, 500.0, "GRAM");
        persistInventory(otherHome, milk, 2.0, "LITER");

        em.flush();
        em.clear();
    }

    @Test
    void findByGroupAndUserShouldReturnGroupItemsOrderedByIngredientName() {
        List<Inventory> result = inventoryRepository
                .findByInventoryGroupIdAndInventoryGroupUsersIdOrderByIngredientNameAsc(home.getId(), user.getId());

        assertThat(result)
                .extracting(item -> item.getIngredient().getName())
                .containsExactly("Apple", "Rice");
    }

    @Test
    void findByGroupAndUserPageShouldReturnPagedItems() {
        Page<Inventory> result = inventoryRepository
                .findByInventoryGroupIdAndInventoryGroupUsersIdOrderByIngredientNameAsc(
                        home.getId(),
                        user.getId(),
                        PageRequest.of(0, 1)
                );

        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent())
                .extracting(item -> item.getIngredient().getName())
                .containsExactly("Apple");
    }

    @Test
    void findByUserAndGroupIdsShouldReturnOnlyAccessibleGroups() {
        List<Inventory> result = inventoryRepository
                .findByInventoryGroupUsersIdAndInventoryGroupIdInOrderByInventoryGroupIdAscIngredientNameAsc(
                        user.getId(),
                        List.of(home.getId(), office.getId(), otherHome.getId())
                );

        assertThat(result)
                .extracting(Inventory::getId)
                .containsExactly(homeApple.getId(), homeRice.getId(), officeRice.getId());
    }

    @Test
    void searchByIngredientNameShouldMatchCaseInsensitiveInsideUsersGroups() {
        List<Inventory> result = inventoryRepository
                .findByInventoryGroupUsersIdAndIngredientNameContainingIgnoreCaseOrderByInventoryGroupIdAsc(
                        user.getId(),
                        "ri"
                );

        assertThat(result)
                .extracting(Inventory::getId)
                .containsExactly(homeRice.getId(), officeRice.getId());
    }

    @Test
    void findByUserGroupAndIngredientShouldReturnMatchingItem() {
        assertThat(inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdAndIngredientId(
                user.getId(),
                home.getId(),
                rice.getId()
        ))
                .isPresent()
                .get()
                .extracting(Inventory::getId)
                .isEqualTo(homeRice.getId());
    }

    @Test
    void findByIdAndUserAndGroupShouldRejectInaccessibleItems() {
        assertThat(inventoryRepository.findByIdAndInventoryGroupUsersIdAndInventoryGroupId(
                homeRice.getId(),
                user.getId(),
                home.getId()
        )).isPresent();

        assertThat(inventoryRepository.findByIdAndInventoryGroupUsersIdAndInventoryGroupId(
                homeRice.getId(),
                otherUser.getId(),
                home.getId()
        )).isEmpty();
    }

    @Test
    void findByUserAndIngredientIdOrderedByGroupShouldReturnAllAccessibleStocks() {
        List<Inventory> result = inventoryRepository
                .findByInventoryGroupUsersIdAndIngredientIdOrderByInventoryGroupIdAsc(user.getId(), rice.getId());

        assertThat(result)
                .extracting(Inventory::getId)
                .containsExactly(homeRice.getId(), officeRice.getId());
    }

    private User persistUser(String id, String email) {
        User newUser = User.builder()
                .id(id)
                .email(email)
                .active(true)
                .inventoryGroups(new ArrayList<>())
                .build();
        return em.persistAndFlush(newUser);
    }

    private InventoryGroup persistGroupForUser(User owner, String name) {
        InventoryGroup group = InventoryGroup.builder()
                .name(name)
                .users(new ArrayList<>())
                .build();
        em.persistAndFlush(group);
        owner.getInventoryGroups().add(group);
        group.getUsers().add(owner);
        em.persistAndFlush(owner);
        return group;
    }

    private Ingredient persistIngredient(String name) {
        return em.persistAndFlush(Ingredient.builder()
                .name(name)
                .category(Ingredient.Category.OTHER)
                .build());
    }

    private Inventory persistInventory(InventoryGroup group, Ingredient ingredient, Double quantity, String unit) {
        return em.persistAndFlush(Inventory.builder()
                .inventoryGroup(group)
                .ingredient(ingredient)
                .quantity(quantity)
                .unit(unit)
                .build());
    }
}
