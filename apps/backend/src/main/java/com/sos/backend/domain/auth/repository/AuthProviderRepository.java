package com.sos.backend.domain.auth.repository;

import com.sos.backend.domain.auth.entity.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthProviderRepository extends JpaRepository<AuthProvider, Long> {

    @Modifying
    @Query("delete from AuthProvider ap where ap.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);
}
