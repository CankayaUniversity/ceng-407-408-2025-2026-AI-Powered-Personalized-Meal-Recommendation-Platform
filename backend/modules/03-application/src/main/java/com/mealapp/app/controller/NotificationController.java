package com.mealapp.app.controller;

import com.mealapp.app.model.dto.notification.NotificationResponse;
import com.mealapp.app.model.mapper.inventory.InventoryMapper;
import com.mealapp.domain.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final InventoryMapper inventoryMapper;

    @GetMapping
    public List<NotificationResponse> getNotifications(@AuthenticationPrincipal Jwt jwt) {
        return inventoryMapper.toNotificationResponses(notificationService.getNotificationsForUser(jwt.getSubject()));
    }

    @GetMapping("/unread-count")
    public long getUnreadCount(@AuthenticationPrincipal Jwt jwt) {
        return notificationService.getUnreadCount(jwt.getSubject());
    }

    @PostMapping("/{notificationId}/read")
    public void markAsRead(@AuthenticationPrincipal Jwt jwt, @PathVariable Long notificationId) {
        notificationService.markAsRead(notificationId, jwt.getSubject());
    }

    @PostMapping("/read-all")
    public void markAllAsRead(@AuthenticationPrincipal Jwt jwt) {
        notificationService.markAllAsRead(jwt.getSubject());
    }

    @DeleteMapping("/{notificationId}")
    public void deleteNotification(@AuthenticationPrincipal Jwt jwt, @PathVariable Long notificationId) {
        notificationService.deleteNotification(notificationId, jwt.getSubject());
    }

    @DeleteMapping("/selected")
    public void deleteSelected(@AuthenticationPrincipal Jwt jwt, @RequestBody List<Long> notificationIds) {
        notificationService.deleteSelectedNotifications(notificationIds, jwt.getSubject());
    }

    @DeleteMapping("/all")
    public void deleteAll(@AuthenticationPrincipal Jwt jwt) {
        notificationService.deleteAllNotifications(jwt.getSubject());
    }
}
