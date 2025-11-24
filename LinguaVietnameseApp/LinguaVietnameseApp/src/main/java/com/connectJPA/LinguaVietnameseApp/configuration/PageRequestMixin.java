package com.connectJPA.LinguaVietnameseApp.configuration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

public abstract class PageRequestMixin extends PageRequest {

    @JsonCreator
    protected PageRequestMixin(@JsonProperty("page") int page, 
                               @JsonProperty("size") int size, 
                               @JsonProperty("sort") Sort sort) {
        super(page, size, sort);
    }
}