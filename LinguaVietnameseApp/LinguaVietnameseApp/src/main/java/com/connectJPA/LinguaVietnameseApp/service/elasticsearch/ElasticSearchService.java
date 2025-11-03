package com.connectJPA.LinguaVietnameseApp.service.elasticsearch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits; // Import thêm class này
import org.springframework.data.elasticsearch.core.query.Criteria;
import org.springframework.data.elasticsearch.core.query.CriteriaQuery;
import org.springframework.data.elasticsearch.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ElasticSearchService {

    private final ElasticsearchOperations elasticsearchOperations;

    public ElasticSearchService(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    /**
     * Generic search method with pagination
     */
    public <T> Page<T> search(Class<T> clazz, String keyword, List<String> fields,
                              Map<String, Object> filters, int page, int size) {

        Criteria criteria = new Criteria();

        if (keyword != null && !keyword.isEmpty() && !fields.isEmpty()) {
            Criteria fieldCriteria = new Criteria();
            fields.forEach(f -> fieldCriteria.or(new Criteria(f).contains(keyword)));

            criteria.and(fieldCriteria);
        }

        if (filters != null && !filters.isEmpty()) {

            filters.forEach((field, value) -> {
                criteria.and(new Criteria(field).is(value));
            });
        }

        Query query = new CriteriaQuery(criteria).setPageable(PageRequest.of(page, size));

        SearchHits<T> searchHits = elasticsearchOperations.search(query, clazz);

        List<T> content = searchHits.getSearchHits().stream()
                .map(SearchHit::getContent)
                .collect(Collectors.toList());

        long totalHits = searchHits.getTotalHits();

        return new PageImpl<>(content, PageRequest.of(page, size), totalHits);
    }

    public <T> void index(T entity) {
        elasticsearchOperations.save(entity);
    }

    public <T> void delete(T entity) {
        elasticsearchOperations.delete(entity);
    }
}