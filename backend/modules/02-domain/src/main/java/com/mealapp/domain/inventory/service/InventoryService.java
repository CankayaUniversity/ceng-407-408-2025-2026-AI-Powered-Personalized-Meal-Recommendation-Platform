package com.mealapp.domain.inventory.service;

import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.repository.InventoryGroupRepository;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import com.mealapp.domain.recipe.service.UnitConverterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Locale;

/**
 * Kullanıcı envanteri ve lokasyon bazlı stok yönetimi iş mantığını yönetir.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryGroupRepository inventoryGroupRepository;
    private final UserRepository userRepository;
    private final IngredientRepository ingredientRepository;
    private final UnitConverterService unitConverterService;

    public enum UpdateMode {
        ADD, SUBTRACT, SET
    }

    /**
     * Kullanıcının tüm lokasyonlardaki envanterini getirir.
     */
    @Transactional
    public List<Inventory> getUserInventory(String userId) {
        List<Long> groupIds = inventoryGroupRepository.findByUsersIdOrderByIdAsc(userId).stream()
                .map(InventoryGroup::getId)
                .toList();
        if (groupIds.isEmpty()) {
            return Collections.singletonList(ensureUserHasDefaultGroup(userId)).stream()
                    .flatMap(g -> inventoryRepository.findByInventoryGroupIdAndInventoryGroupUsersIdOrderByIngredientNameAsc(g.getId(), userId).stream())
                    .toList();
        }
        return inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdInOrderByInventoryGroupIdAscIngredientNameAsc(userId, groupIds);
    }

    /**
     * Kullanıcının belirli bir lokasyona ait envanterini getirir.
     */
    @Transactional(readOnly = true)
    public List<Inventory> getUserInventory(String userId, Long inventoryGroupId) {
        getRequiredGroup(userId, inventoryGroupId);
        return inventoryRepository.findByInventoryGroupIdAndInventoryGroupUsersIdOrderByIngredientNameAsc(inventoryGroupId, userId);
    }

    /**
     * Kullanıcıya ait envanter lokasyonlarını ve içeriklerini getirir.
     */
    @Transactional
    public List<InventoryGroup> getUserInventoryGroups(String userId) {
        List<InventoryGroup> groups = inventoryGroupRepository.findByUsersIdOrderByIdAsc(userId);
        if (groups.isEmpty()) {
            ensureUserHasDefaultGroup(userId);
            groups = inventoryGroupRepository.findByUsersIdOrderByIdAsc(userId);
        }
        groups.forEach(this::hydrateGroup);
        return groups;
    }

    /**
     * Kullanıcıya ait envanter lokasyonlarını ve içeriklerini sayfalanmış şekilde getirir.
     */
    @Transactional
    public org.springframework.data.domain.Page<InventoryGroup> getUserInventoryGroups(String userId, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<InventoryGroup> groups = inventoryGroupRepository.findByUsersIdOrderByIdAsc(userId, pageable);
        if (groups.isEmpty() && pageable.getPageNumber() == 0) {
            ensureUserHasDefaultGroup(userId);
            groups = inventoryGroupRepository.findByUsersIdOrderByIdAsc(userId, pageable);
        }
        groups.forEach(this::hydrateGroup);
        return groups;
    }

    /**
     * Belirli bir envanter grubundaki malzemeleri sayfalanmış şekilde getirir.
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Inventory> getInventoryItemsByGroup(String userId, Long groupId, org.springframework.data.domain.Pageable pageable) {
        // Güvenlik kontrolü: Kullanıcı bu gruba dahil mi?
        getRequiredGroup(userId, groupId);
        return inventoryRepository.findByInventoryGroupIdAndInventoryGroupUsersIdOrderByIngredientNameAsc(groupId, userId, pageable);
    }

    /**
     * Yeni bir envanter lokasyonu oluşturur.
     */
    public InventoryGroup createGroup(String userId, String name, String icon) {
        String normalizedName = normalizeGroupName(name);
        ensureGroupNameAvailable(userId, normalizedName, null);

        User user = getRequiredUser(userId);
        InventoryGroup group = InventoryGroup.builder()
                .name(normalizedName)
                .icon(normalizeIcon(icon))
                .users(new ArrayList<>(List.of(user)))
                .build();
        
        user.getInventoryGroups().add(group);

        inventoryGroupRepository.save(group);
        userRepository.save(user);

        return hydrateGroup(group);
    }

    /**
     * Var olan envanter lokasyonunu günceller.
     */
    public InventoryGroup updateGroup(String userId, Long groupId, String name, String icon) {
        InventoryGroup group = getRequiredGroup(userId, groupId);
        String normalizedName = normalizeGroupName(name);
        ensureGroupNameAvailable(userId, normalizedName, group.getId());

        group.setName(normalizedName);
        group.setIcon(normalizeIcon(icon));
        return hydrateGroup(inventoryGroupRepository.save(group));
    }

    /**
     * Envanter lokasyonunu siler.
     */
    public void deleteGroup(String userId, Long groupId) {
        InventoryGroup group = getRequiredGroup(userId, groupId);

        if (inventoryGroupRepository.countByUsersId(userId) <= 1) {
            throw new MealAppDomainException("En az bir envanter lokasyonu bulunmalıdır.");
        }

        inventoryGroupRepository.delete(group);
    }

    /**
     * Belirli bir lokasyona malzeme ekler ya da aynı malzemeyi günceller.
     * Eğer malzeme zaten varsa, updateMode parametresine göre miktar güncellenir.
     */
    @Transactional
    public Inventory upsertInventoryItem(String userId, Long inventoryGroupId, Long ingredientId, Double quantity, String unit, UpdateMode updateMode) {
        InventoryGroup group = getRequiredGroup(userId, inventoryGroupId);
        Ingredient ingredient = getRequiredIngredient(ingredientId);

        return inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdAndIngredientId(userId, inventoryGroupId, ingredientId)
                .map(existing -> {
                    double currentQuantity = existing.getQuantity() != null ? existing.getQuantity() : 0.0;
                    double finalQuantity;

                    if (updateMode == UpdateMode.ADD) {
                        // Yeni eklenen miktarı envanterdeki birime dönüştür
                        double quantityInInventoryUnit = unitConverterService.convertUnits(ingredient, quantity, unit, existing.getUnit());
                        finalQuantity = currentQuantity + quantityInInventoryUnit;
                    } else if (updateMode == UpdateMode.SUBTRACT) {
                        // Çıkarılan miktarı envanterdeki birime dönüştür
                        double quantityInInventoryUnit = unitConverterService.convertUnits(ingredient, quantity, unit, existing.getUnit());
                        finalQuantity = Math.max(0, currentQuantity - quantityInInventoryUnit);
                    } else {
                        finalQuantity = quantity;
                        existing.setUnit(normalizeUnit(unit)); // SET modunda birimi de güncelle
                    }

                    existing.setQuantity(finalQuantity);
                    return inventoryRepository.save(existing);
                })
                .orElseGet(() -> inventoryRepository.save(Inventory.builder()
                        .inventoryGroup(group)
                        .ingredient(ingredient)
                        .quantity(quantity)
                        .unit(normalizeUnit(unit))
                        .build()));
    }

    /**
     * Belirli bir lokasyona malzeme ekler ya da aynı malzemeyi günceller (SET modu ile).
     */
    @Transactional
    public Inventory upsertInventoryItem(String userId, Long inventoryGroupId, Long ingredientId, Double quantity, String unit) {
        return upsertInventoryItem(userId, inventoryGroupId, ingredientId, quantity, unit, UpdateMode.SET);
    }

    /**
     * Mevcut bir envanter malzemesini günceller.
     */
    @Transactional
    public Inventory updateInventoryItem(String userId, Long inventoryGroupId, Long itemId, Long ingredientId, Double quantity, String unit, UpdateMode updateMode) {
        Inventory item = inventoryRepository.findByIdAndInventoryGroupUsersIdAndInventoryGroupId(itemId, userId, inventoryGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("Envanter malzemesi bulunamadı ID: " + itemId));

        if (!item.getIngredient().getId().equals(ingredientId)) {
            inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdAndIngredientId(userId, inventoryGroupId, ingredientId)
                    .filter(existing -> !existing.getId().equals(itemId))
                    .ifPresent(existing -> {
                        throw new MealAppDomainException("Bu malzeme seçili lokasyonda zaten mevcut.");
                    });
        }

        item.setIngredient(getRequiredIngredient(ingredientId));

        Double finalQuantity;
        double currentQuantity = item.getQuantity() != null ? item.getQuantity() : 0.0;

        if (updateMode == UpdateMode.ADD) {
            double quantityInInventoryUnit = unitConverterService.convertUnits(item.getIngredient(), quantity, unit, item.getUnit());
            finalQuantity = currentQuantity + quantityInInventoryUnit;
        } else if (updateMode == UpdateMode.SUBTRACT) {
            double quantityInInventoryUnit = unitConverterService.convertUnits(item.getIngredient(), quantity, unit, item.getUnit());
            finalQuantity = Math.max(0, currentQuantity - quantityInInventoryUnit);
        } else {
            finalQuantity = quantity;
            item.setUnit(normalizeUnit(unit)); // SET modunda birimi güncelle
        }

        item.setQuantity(finalQuantity);
        return inventoryRepository.save(item);
    }

    /**
     * Bir envanter malzemesini siler.
     */
    public void deleteInventoryItem(String userId, Long inventoryGroupId, Long itemId) {
        Inventory item = inventoryRepository.findByIdAndInventoryGroupUsersIdAndInventoryGroupId(itemId, userId, inventoryGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("Envanter malzemesi bulunamadı ID: " + itemId));
        inventoryRepository.delete(item);
    }

    /**
     * Belirli bir lokasyonu doğrular ve döndürür.
     */
    @Transactional(readOnly = true)
    public InventoryGroup getUserInventoryGroup(String userId, Long inventoryGroupId) {
        return getRequiredGroupWithUsers(userId, inventoryGroupId);
    }

    /**
     * Varsayılan lokasyona toplu envanter güncellemesi yapar.
     */
    public void updateInventory(String userId, List<Inventory> newItems) {
        InventoryGroup defaultGroup = ensureUserHasDefaultGroup(userId);

        for (Inventory item : newItems) {
            if (item.getIngredient() == null || item.getIngredient().getId() == null) {
                continue;
            }

            upsertInventoryItem(
                    userId,
                    defaultGroup.getId(),
                    item.getIngredient().getId(),
                    item.getQuantity(),
                    item.getUnit()
            );
        }
    }

    /**
     * Verilen malzemeleri kullanıcının lokasyonlar arası stoklarından düşer.
     */
    public void consumeFromInventory(String userId, Long ingredientId, Double quantityToDeduct, String unit) {
        if (quantityToDeduct == null || quantityToDeduct <= 0) {
            return;
        }

        Ingredient ingredient = getRequiredIngredient(ingredientId);
        List<Inventory> items = inventoryRepository.findByInventoryGroupUsersIdAndIngredientIdOrderByInventoryGroupIdAsc(userId, ingredientId);
        
        // Önce toplam stoğu aynı birime dönüştürüp kontrol etmeliyiz
        double totalAvailableInTargetUnit = 0;
        for (Inventory item : items) {
            totalAvailableInTargetUnit += unitConverterService.convertUnits(ingredient, item.getQuantity(), item.getUnit(), unit);
        }
        
        if (totalAvailableInTargetUnit < quantityToDeduct) {
            throw new com.mealapp.domain.common.exception.InsufficientStockException(
                    String.format("Envanterinizde '%s' malzemesi için yeterli stok yok. Mevcut: %.2f %s, Gerekli: %.2f %s",
                            ingredient.getName(), totalAvailableInTargetUnit, unit, quantityToDeduct, unit));
        }

        double remainingToDeduct = quantityToDeduct;

        for (Inventory existing : items) {
            if (remainingToDeduct <= 0) break;
            
            double currentQuantity = existing.getQuantity() != null ? existing.getQuantity() : 0.0;
            if (currentQuantity <= 0) {
                inventoryRepository.delete(existing);
                continue;
            }

            // Envanterdeki miktarı, düşülecek birime dönüştür
            double existingInDeductUnit = unitConverterService.convertUnits(ingredient, currentQuantity, existing.getUnit(), unit);

            if (existingInDeductUnit <= remainingToDeduct) {
                remainingToDeduct -= existingInDeductUnit;
                existing.setQuantity(0.0);
                inventoryRepository.save(existing);
            } else {
                // Kalanı envanter birimine geri dönüştürerek düş
                double deductInInventoryUnit = unitConverterService.convertUnits(ingredient, remainingToDeduct, unit, existing.getUnit());
                existing.setQuantity(currentQuantity - deductInInventoryUnit);
                inventoryRepository.save(existing);
                remainingToDeduct = 0;
            }
        }
    }

    public void consumeFromInventory(String userId, Long ingredientId, Double quantityToDeduct) {
        consumeFromInventory(userId, ingredientId, quantityToDeduct, "g");
    }

    /**
     * Verilen malzemeyi seçili lokasyondaki stoktan düşer.
     * Eğer malzeme lokasyonda yoksa veya stok yetersizse istisna fırlatır.
     */
    public void consumeFromInventoryGroup(String userId, Long inventoryGroupId, Long ingredientId, Double quantityToDeduct, String unit) {
        if (quantityToDeduct == null || quantityToDeduct <= 0) {
            return;
        }

        InventoryGroup group = getRequiredGroupWithUsers(userId, inventoryGroupId);
        Ingredient ingredient = getRequiredIngredient(ingredientId);

        Inventory inventory = inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdAndIngredientId(userId, inventoryGroupId, ingredientId)
                .orElseThrow(() -> new com.mealapp.domain.common.exception.InsufficientStockException(
                        String.format("HATA: '%s' lokasyonunda '%s' malzemesi bulunamadı! Lütfen önce envanterinize bu malzemeyi ekleyin.",
                                group.getName(), ingredient.getName())));

        double currentQuantity = inventory.getQuantity() != null ? inventory.getQuantity() : 0.0;
        
        // Envanterdeki miktarı, talep edilen birime dönüştürerek kontrol et
        double currentInRequestedUnit = unitConverterService.convertUnits(ingredient, currentQuantity, inventory.getUnit(), unit);

        if (currentInRequestedUnit < quantityToDeduct) {
            throw new com.mealapp.domain.common.exception.InsufficientStockException(
                    String.format("STOK YETERSİZ: '%s' lokasyonunda '%s' malzemesinden sadece %.2f %s var, ancak %.2f %s tüketilmeye çalışılıyor.",
                            group.getName(), ingredient.getName(), currentInRequestedUnit, unit, quantityToDeduct, unit));
        }

        // Düşülecek miktarı envanter birimine dönüştür
        double deductInInventoryUnit = unitConverterService.convertUnits(ingredient, quantityToDeduct, unit, inventory.getUnit());
        inventory.setQuantity(Math.max(0, currentQuantity - deductInInventoryUnit));
        inventoryRepository.save(inventory);
    }

    public void consumeFromInventoryGroup(String userId, Long inventoryGroupId, Long ingredientId, Double quantityToDeduct) {
        consumeFromInventoryGroup(userId, inventoryGroupId, ingredientId, quantityToDeduct, "g");
    }

    @Transactional
    public InventoryGroup ensureUserHasDefaultGroup(String userId) {
        return inventoryGroupRepository.findFirstByUsersIdOrderByIdAsc(userId)
                .orElseGet(() -> {
                    User user = getRequiredUser(userId);
                    InventoryGroup group = InventoryGroup.builder()
                            .name("Home")
                            .icon("home")
                            .users(new ArrayList<>(List.of(user))) // users listesini başlat
                            .build();
                    
                    user.getInventoryGroups().add(group);

                    inventoryGroupRepository.save(group);
                    userRepository.save(user);
                    
                    return group;
                });
    }

    public InventoryGroup getRequiredGroup(String userId, Long groupId) {
        return inventoryGroupRepository.findByIdAndUsersId(groupId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Envanter lokasyonu bulunamadı ID: " + groupId));
    }

    public InventoryGroup getRequiredGroupWithUsers(String userId, Long groupId) {
        return inventoryGroupRepository.findByIdAndUsersIdWithUsers(groupId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Envanter lokasyonu bulunamadı ID: " + groupId));
    }

    @Transactional(readOnly = true)
    public List<Inventory> getLowAndMissingStockItems(String userId, List<Long> groupIds) {
        // Eğer grup ID'leri verilmemişse kullanıcının tüm gruplarını al
        List<Long> finalGroupIds = (groupIds == null || groupIds.isEmpty())
                ? inventoryGroupRepository.findByUsersIdOrderByIdAsc(userId).stream()
                    .map(InventoryGroup::getId)
                    .toList()
                : groupIds;

        if (finalGroupIds.isEmpty()) {
            return Collections.emptyList();
        }

        // Miktarı 0 olanlar (MISSING) veya belirli bir eşiğin altında olanlar (LOW)
        return inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdInOrderByInventoryGroupIdAscIngredientNameAsc(userId, finalGroupIds)
                .stream()
                .filter(item -> {
                    if (item.getQuantity() == null || item.getQuantity() <= 0) return true;
                    
                    String unit = item.getUnit() != null ? item.getUnit().toUpperCase() : "";
                    double qty = item.getQuantity();
                    
                    // Birime göre dinamik eşik değerleri
                    return switch (unit) {
                        case "GRAM" -> qty <= 250.0;
                        case "ML" -> qty <= 500.0;
                        case "LITRE" -> qty <= 1.0;
                        case "KG", "KILOGRAM" -> qty <= 0.5;
                        case "ADET", "PAKET" -> qty <= 2.0;
                        default -> qty <= 2.0;
                    };
                })
                .toList();
    }

    private User getRequiredUser(String userId) {
        return userRepository.findById(userId)
                .orElseGet(() -> userRepository.save(User.builder()
                        .id(userId)
                        .build()));
    }

    private Ingredient getRequiredIngredient(Long ingredientId) {
        return ingredientRepository.findByIdWithUnits(ingredientId)
                .orElseThrow(() -> new ResourceNotFoundException("Malzeme bulunamadı ID: " + ingredientId));
    }

    private void ensureGroupNameAvailable(String userId, String name, Long currentGroupId) {
        boolean exists = currentGroupId == null
                ? inventoryGroupRepository.existsByUsersIdAndNameIgnoreCase(userId, name)
                : inventoryGroupRepository.existsByUsersIdAndNameIgnoreCaseAndIdNot(userId, name, currentGroupId);

        if (exists) {
            throw new MealAppDomainException("Bu isimde bir envanter lokasyonu zaten mevcut.");
        }
    }

    private String normalizeGroupName(String name) {
        if (name == null || name.isBlank()) {
            throw new MealAppDomainException("Envanter lokasyonu adı boş olamaz.");
        }

        return name.trim();
    }

    private String normalizeIcon(String icon) {
        if (icon == null || icon.isBlank()) {
            return "home";
        }

        return icon.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeUnit(String unit) {
        if (unit == null || unit.isBlank()) {
            throw new MealAppDomainException("Birim bilgisi boş olamaz.");
        }

        return unit.trim();
    }


    /**
     * Envanter lokasyonundan kullanıcıyı çıkarır.
     */
    public InventoryGroup removeUserFromGroup(String userId, Long groupId, String userIdToRemove) {
        InventoryGroup group = getRequiredGroupWithUsers(userId, groupId);
        
        if (userId.equals(userIdToRemove)) {
            throw new MealAppDomainException("Kendinizi lokasyondan çıkaramazsınız.");
        }

        User userToRemove = userRepository.findById(userIdToRemove)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + userIdToRemove));

        group.getUsers().removeIf(u -> u.getId().equals(userIdToRemove));
        userToRemove.getInventoryGroups().removeIf(g -> g.getId().equals(groupId));

        userRepository.save(userToRemove);
        return hydrateGroup(inventoryGroupRepository.save(group));
    }

    private InventoryGroup hydrateGroup(InventoryGroup group) {
        if (group.getItems() != null) {
            group.getItems().size();
            group.getItems().forEach(item -> {
                if (item.getIngredient() != null) {
                    item.getIngredient().getName();
                    if (item.getIngredient().getIngredientUnits() != null) {
                        item.getIngredient().getIngredientUnits().size();
                    }
                }
            });
        }

        return group;
    }
}
