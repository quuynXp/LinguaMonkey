package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.id.UserCertificateId;
import com.connectJPA.LinguaVietnameseApp.enums.Certification;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "user_certificates")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserCertificate {

    @EmbeddedId
    UserCertificateId id;

    // optional thêm timestamp
    @CreationTimestamp
    private OffsetDateTime createdAt;

    // constructor tiện lợi
    public UserCertificate(UUID userId, Certification certificate) {
        this.id = new UserCertificateId(userId, certificate.name());
        this.createdAt = java.time.OffsetDateTime.now();
    }
}
