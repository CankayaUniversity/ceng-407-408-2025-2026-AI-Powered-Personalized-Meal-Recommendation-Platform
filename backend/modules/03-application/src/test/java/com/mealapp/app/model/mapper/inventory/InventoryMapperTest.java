package com.mealapp.app.model.mapper.inventory;

import com.mealapp.app.model.dto.notification.NotificationResponse;
import com.mealapp.app.model.mapper.recipe.IngredientMapper;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.app.util.MessageUtil;
import com.mealapp.domain.inventory.repository.InventoryInvitationRepository;
import com.mealapp.domain.notification.entity.Notification;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.StaticMessageSource;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class InventoryMapperTest {

    private final InventoryInvitationRepository invitationRepository = mock(InventoryInvitationRepository.class);
    private final RecipeRepository recipeRepository = mock(RecipeRepository.class);
    private final MessageUtil messageUtil = new MessageUtil(messageSource());
    private final InventoryMapper mapper = new InventoryMapper(
            mock(IngredientMapper.class),
            mock(UserMapper.class),
            invitationRepository,
            recipeRepository,
            messageUtil
    );

    @AfterEach
    void resetLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    void toNotificationResponseResolvesCodedNotificationText() {
        LocaleContextHolder.setLocale(Locale.ENGLISH);
        when(invitationRepository.findById(42L)).thenReturn(Optional.empty());

        Notification notification = Notification.builder()
                .id(1L)
                .title("Fallback title")
                .message("Fallback message")
                .titleCode("notification.inventory.invitation.title")
                .messageCode("notification.inventory.invitation.message")
                .messageArgs("Ada\\|Lovelace|Kitchen\\\\Main")
                .type(Notification.NotificationType.INVITATION)
                .targetId("42")
                .status(Notification.NotificationStatus.UNREAD)
                .createdAt(LocalDateTime.now())
                .build();

        NotificationResponse response = mapper.toNotificationResponse(notification);

        assertEquals("Inventory invitation", response.getTitle());
        assertEquals("Ada|Lovelace invited you to Kitchen\\Main", response.getMessage());
    }

    @Test
    void toNotificationResponseFallsBackToStoredTextForLegacyNotifications() {
        Notification notification = Notification.builder()
                .id(2L)
                .title("Legacy title")
                .message("Legacy message")
                .type(Notification.NotificationType.SYSTEM)
                .status(Notification.NotificationStatus.READ)
                .createdAt(LocalDateTime.now())
                .build();

        NotificationResponse response = mapper.toNotificationResponse(notification);

        assertEquals("Legacy title", response.getTitle());
        assertEquals("Legacy message", response.getMessage());
    }

    private static StaticMessageSource messageSource() {
        StaticMessageSource messageSource = new StaticMessageSource();
        messageSource.addMessage("notification.inventory.invitation.title", Locale.ENGLISH, "Inventory invitation");
        messageSource.addMessage("notification.inventory.invitation.message", Locale.ENGLISH, "{0} invited you to {1}");
        return messageSource;
    }
}
