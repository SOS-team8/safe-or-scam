package com.sos.backend.domain.user.repository;

import com.sos.backend.domain.user.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> { }
