package com.sos.backend.domain.auth.repository;

import com.sos.backend.domain.auth.entity.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthProviderRepository extends JpaRepository<AuthProvider, Long> {
}
