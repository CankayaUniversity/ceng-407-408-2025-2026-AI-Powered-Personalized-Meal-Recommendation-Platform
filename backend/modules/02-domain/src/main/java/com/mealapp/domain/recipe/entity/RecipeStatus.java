package com.mealapp.domain.recipe.entity;

/**
 * Tarifin yayınlanma statüsünü belirleyen enum.
 */
public enum RecipeStatus {
    DRAFT,      // Sadece kullanıcı görür, henüz onaya sunulmadı
    PENDING,    // Onay bekliyor
    APPROVED,   // Onaylandı ve herkese açık yayında
    REJECTED,   // Reddedildi
    SUPERSEDED  // Daha yeni bir revizyon açıldığı için geçersiz kaldı
}
