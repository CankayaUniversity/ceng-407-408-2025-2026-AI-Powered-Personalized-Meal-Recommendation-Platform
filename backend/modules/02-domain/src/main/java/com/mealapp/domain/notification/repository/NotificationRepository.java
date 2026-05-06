package com.mealapp.domain.notification.repository;

import com.mealapp.domain.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Notification> findByUserIdAndStatusOrderByCreatedAtDesc(String userId, Notification.NotificationStatus status);
    long countByUserIdAndStatus(String userId, Notification.NotificationStatus status);
    boolean existsByUserIdAndTargetIdAndType(String userId, String targetId, Notification.NotificationType type);
    boolean existsByUserIdAndTargetIdAndTypeAndStatus(String userId, String targetId, Notification.NotificationType type, Notification.NotificationStatus status);
    List<Notification> findByTargetIdAndType(String targetId, Notification.NotificationType type);
}
