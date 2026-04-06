package com.mealapp.app.controller;

import com.mealapp.domain.notification.entity.Notification;
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

    @GetMapping
    public List<Notification> getNotifications(@AuthenticationPrincipal Jwt jwt) {
        return notificationService.getNotificationsForUser(jwt.getSubject());
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
}
