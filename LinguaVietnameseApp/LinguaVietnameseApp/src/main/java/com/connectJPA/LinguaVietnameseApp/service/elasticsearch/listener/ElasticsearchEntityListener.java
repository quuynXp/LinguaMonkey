// package com.connectJPA.LinguaVietnameseApp.service.elasticsearch.listener;

// import com.connectJPA.LinguaVietnameseApp.service.elasticsearch.ElasticSearchService;
// import lombok.RequiredArgsConstructor;
// import org.springframework.stereotype.Component;
// import org.springframework.beans.factory.annotation.Autowired;

// import jakarta.persistence.PostPersist;
// import jakarta.persistence.PostUpdate;
// import jakarta.persistence.PostRemove;

// @Component
// @RequiredArgsConstructor
// public class ElasticsearchEntityListener {

//     private static ElasticSearchService elasticSearchService;

//     @Autowired
//     public void setElasticSearchService(ElasticSearchService service) {
//         ElasticsearchEntityListener.elasticSearchService = service;
//     }

//     @PostPersist
//     @PostUpdate
//     public void index(Object entity) {
//         elasticSearchService.index(entity);
//     }

//     @PostRemove
//     public void delete(Object entity) {
//         elasticSearchService.delete(entity);
//     }
// }
