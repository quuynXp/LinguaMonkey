package com.connectJPA.LinguaVietnameseApp.configuration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.domain.Sort;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public abstract class SortMixin {
    @JsonCreator
    public SortMixin(@JsonProperty("orders") List<Sort.Order> orders) {}
}