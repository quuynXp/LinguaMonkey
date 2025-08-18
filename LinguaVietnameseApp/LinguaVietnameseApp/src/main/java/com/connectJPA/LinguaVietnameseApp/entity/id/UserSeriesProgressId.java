package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Embeddable
@Builder
public class UserSeriesProgressId implements Serializable {
    @Column(name = "series_id", nullable = false)
    private UUID seriesId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;
}
