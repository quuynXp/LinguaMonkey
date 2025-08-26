package com.connectJPA.LinguaVietnameseApp.enums;

import lombok.Getter;

public enum AgeRange {
    AGE_13_17(13, 17),
    AGE_18_24(18, 24),
    AGE_25_34(25, 34),
    AGE_35_44(35, 44),
    AGE_45_54(45, 54),
    AGE_55_PLUS(55, null); // null = không giới hạn max

    private final Integer min;
    private final Integer max;

    AgeRange(Integer min, Integer max) {
        this.min = min;
        this.max = max;
    }

    public Integer getMin() {
        return min;
    }

    public Integer getMax() {
        return max;
    }

    public boolean isInRange(int age) {
        if (max == null) {
            return age >= min;
        }
        return age >= min && age <= max;
    }
}
