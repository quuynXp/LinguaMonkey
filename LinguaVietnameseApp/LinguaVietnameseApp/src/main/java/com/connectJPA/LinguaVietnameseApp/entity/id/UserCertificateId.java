package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Embeddable;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserCertificateId implements Serializable {
    UUID userId;
    String certificate; // lưu enum name
}
