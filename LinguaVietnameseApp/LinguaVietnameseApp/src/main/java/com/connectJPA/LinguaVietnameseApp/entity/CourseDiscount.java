package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Data
@Table(name = "course_discounts")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class CourseDiscount extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "discount_id")
    private UUID discountId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "discount_percentage", nullable = false)
    private int discountPercentage;

    private String code;

    @Column(name = "start_date")
    private OffsetDateTime startDate;

    @Column(name = "end_date")
    private OffsetDateTime endDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}

