package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageResponse<T> {
    private List<T> content;
    private Integer pageNumber;
    private Integer pageSize;
    private Long totalElements;
    private Integer totalPages;
    private Boolean isLast;
    private Boolean isFirst;
    private Boolean hasNext;
    private Boolean hasPrevious;
}
