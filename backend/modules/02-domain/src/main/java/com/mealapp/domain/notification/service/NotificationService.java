package com.mealapp.domain.notification.service;

import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.notification.entity.Notification;
import com.mealapp.domain.notification.repository.NotificationRepository;
import com.mealapp.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public Notification createNotification(User user, String title, String message, Notification.NotificationType type, String targetId) {
        // Eğer aynı targetId ve tipte OKUNMAMIŞ bir bildirim varsa mükerrer oluşturma
        if (targetId != null && notificationRepository.existsByUserIdAndTargetIdAndTypeAndStatus(
                user.getId(), targetId, type, Notification.NotificationStatus.UNREAD)) {
            return null; 
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

    @Transactional
    public Notification createLocalizedNotification(
            User user,
            String titleCode,
            String messageCode,
            List<String> messageArgs,
            Notification.NotificationType type,
            String targetId
    ) {
        if (targetId != null && notificationRepository.existsByUserIdAndTargetIdAndTypeAndStatus(
                user.getId(), targetId, type, Notification.NotificationStatus.UNREAD)) {
            return null;
        }
        Notification notification = Notification.builder()
                .user(user)
                .title(titleCode)
                .message(messageCode)
                .titleCode(titleCode)
                .messageCode(messageCode)
                .messageArgs(encodeArgs(messageArgs))
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
                .orElseThrow(() -> ResourceNotFoundException.withCode("domain.notification.not_found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw MealAppDomainException.withCode("domain.notification.mark_read_unauthorized");
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
                .orElseThrow(() -> ResourceNotFoundException.withCode("domain.notification.not_found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw MealAppDomainException.withCode("domain.notification.delete_unauthorized");
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

    @Transactional
    public void updateNotificationsForTarget(String targetId, Notification.NotificationType type, String newTitle, String newMessage, String newTargetId) {
        List<Notification> notifications = notificationRepository.findByTargetIdAndType(targetId, type);
        for (Notification notification : notifications) {
            notification.setTitle(newTitle);
            notification.setMessage(newMessage);
            notification.setStatus(Notification.NotificationStatus.READ);
            if (newTargetId != null) {
                notification.setTargetId(newTargetId);
            }
        }
        notificationRepository.saveAll(notifications);
    }

    @Transactional
    public void updateLocalizedNotificationsForTarget(
            String targetId,
            Notification.NotificationType type,
            String titleCode,
            String messageCode,
            List<String> messageArgs,
            String newTargetId
    ) {
        List<Notification> notifications = notificationRepository.findByTargetIdAndType(targetId, type);
        for (Notification notification : notifications) {
            notification.setTitle(titleCode);
            notification.setMessage(messageCode);
            notification.setTitleCode(titleCode);
            notification.setMessageCode(messageCode);
            notification.setMessageArgs(encodeArgs(messageArgs));
            notification.setStatus(Notification.NotificationStatus.READ);
            if (newTargetId != null) {
                notification.setTargetId(newTargetId);
            }
        }
        notificationRepository.saveAll(notifications);
    }

    private String encodeArgs(List<String> args) {
        if (args == null || args.isEmpty()) {
            return null;
        }
        return args.stream()
                .map(arg -> arg == null ? "" : arg.replace("\\", "\\\\").replace("|", "\\|"))
                .collect(Collectors.joining("|"));
    }
}
