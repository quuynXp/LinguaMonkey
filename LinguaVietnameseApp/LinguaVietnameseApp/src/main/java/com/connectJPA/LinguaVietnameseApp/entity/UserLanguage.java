package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserLanguageId;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_languages")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class UserLanguage extends BaseEntity {

    @EmbeddedId
    private UserLanguageId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "proficiency_level")
    private ProficiencyLevel proficiencyLevel;
    
    @Version // <-- THÊM TRƯỜNG VERSIONING
    private Long version;
}