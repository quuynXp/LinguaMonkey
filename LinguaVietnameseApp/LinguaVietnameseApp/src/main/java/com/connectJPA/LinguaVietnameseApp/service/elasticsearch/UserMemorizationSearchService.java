package com.connectJPA.LinguaVietnameseApp.service.elasticsearch;

import com.connectJPA.LinguaVietnameseApp.entity.UserMemorization;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserMemorizationSearchService {
    private final ElasticSearchService elasticSearchService;
    private static final List<String> SEARCH_FIELDS = List.of("noteText");

    public Page<UserMemorization> searchMemorizations(String keyword, int page, int size, Map<String,Object> filters){
        return elasticSearchService.search(UserMemorization.class, keyword, SEARCH_FIELDS, filters, page, size);
    }

    public void indexMemorization(UserMemorization mem) { elasticSearchService.index(mem); }
    public void deleteMemorization(UserMemorization mem) { elasticSearchService.delete(mem); }
}
