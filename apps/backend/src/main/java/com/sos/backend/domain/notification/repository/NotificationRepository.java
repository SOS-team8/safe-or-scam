package com.sos.backend.domain.notification.repository;

import com.sos.backend.domain.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Modifying
    @Query("delete from Notification n where n.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    @Query("select n from Notification n where n.user.id = :userId order by n.createdAt desc")
    List<Notification> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Query("select n from Notification n where n.id = :id and n.user.id = :userId")
    Optional<Notification> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
}
