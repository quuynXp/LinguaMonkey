package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserCertificate;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserCertificateId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserCertificateRepository extends JpaRepository<UserCertificate, UserCertificateId> {

    List<UserCertificate> findAllByIdUserId(UUID userId);

}
