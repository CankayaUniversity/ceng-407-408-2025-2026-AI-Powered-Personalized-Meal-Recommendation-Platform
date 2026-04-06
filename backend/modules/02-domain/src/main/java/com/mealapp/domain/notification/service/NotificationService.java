package com.mealapp.domain.notification.service;

import com.mealapp.domain.notification.entity.Notification;
import com.mealapp.domain.notification.repository.NotificationRepository;
import com.mealapp.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public Notification createNotification(User user, String title, String message, Notification.NotificationType type, String targetId) {
        if (targetId != null && notificationRepository.existsByUserIdAndTargetIdAndType(user.getId(), targetId, type)) {
            return null; // Zaten bildirim var
        }
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .targetId(targetId)
                .status(Notification.NotificationStatus.UNREAD)
                .build();
        return notificationRepository.save(notification);
    }

    public List<Notification> getNotificationsForUser(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndStatus(userId, Notification.NotificationStatus.UNREAD);
    }

    public boolean existsNotification(String userId, String targetId, Notification.NotificationType type) {
        return notificationRepository.existsByUserIdAndTargetIdAndType(userId, targetId, type);
    }

    @Transactional
    public void markAsRead(Long notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to mark this notification as read");
        }

        notification.setStatus(Notification.NotificationStatus.READ);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, Notification.NotificationStatus.UNREAD);
        unread.forEach(n -> n.setStatus(Notification.NotificationStatus.READ));
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void deleteNotification(Long notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to delete this notification");
        }

        notificationRepository.delete(notification);
    }

    @Transactional
    public void deleteSelectedNotifications(List<Long> notificationIds, String userId) {
        List<Notification> notifications = notificationRepository.findAllById(notificationIds);
        
        // Sadece kullanıcıya ait olanları filtrele ve sil
        List<Notification> toDelete = notifications.stream()
                .filter(n -> n.getUser().getId().equals(userId))
                .toList();
                
        notificationRepository.deleteAll(toDelete);
    }

    @Transactional
    public void deleteAllNotifications(String userId) {
        List<Notification> all = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notificationRepository.deleteAll(all);
    }
}
