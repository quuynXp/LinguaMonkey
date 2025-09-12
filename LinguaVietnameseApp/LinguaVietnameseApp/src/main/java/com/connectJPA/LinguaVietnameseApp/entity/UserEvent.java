package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserEventId;
import jakarta.persistence.*;
import jdk.jfr.Enabled;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.hibernate.dialect.pagination.OffsetFetchLimitHandler;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@SuperBuilder
@Table(name = "user_events")
@Entity
@AllArgsConstructor
@NoArgsConstructor
public class UserEvent extends BaseEntity {
    @EmbeddedId
    private UserEventId id;

    private int score;
    private int rank;
    private OffsetDateTime participatedAt;
    private boolean isCompleted;
}
