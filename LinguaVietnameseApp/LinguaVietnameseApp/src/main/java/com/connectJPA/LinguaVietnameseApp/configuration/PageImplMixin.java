package com.connectJPA.LinguaVietnameseApp.configuration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public abstract class PageImplMixin<T> extends PageImpl<T> {

    @JsonCreator
    public PageImplMixin(@JsonProperty("content") List<T> content,
                         @JsonProperty("pageable") @JsonDeserialize(as = PageRequest.class) Pageable pageable,
                         @JsonProperty("totalElements") long totalElements) {
        super(content, pageable, totalElements);
    }
}