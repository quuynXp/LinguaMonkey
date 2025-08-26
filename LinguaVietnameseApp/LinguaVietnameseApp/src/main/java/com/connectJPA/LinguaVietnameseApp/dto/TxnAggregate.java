package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class TxnAggregate {
    long count;
    BigDecimal total;
}
