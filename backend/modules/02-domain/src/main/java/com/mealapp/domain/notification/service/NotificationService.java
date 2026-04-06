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
}
