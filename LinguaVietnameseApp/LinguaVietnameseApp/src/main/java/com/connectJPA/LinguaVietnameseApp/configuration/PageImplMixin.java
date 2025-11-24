package com.connectJPA.LinguaVietnameseApp.configuration;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

public abstract class PageImplMixin<T> extends PageImpl<T> {

    @JsonCreator
    public PageImplMixin(@JsonProperty("content") List<T> content,
                         @JsonProperty("pageable") Pageable pageable,
                         @JsonProperty("totalElements") long totalElements) {
        super(content, pageable, totalElements);
    }
}