package com.connectJPA.LinguaVietnameseApp.service.elasticsearch;

import com.connectJPA.LinguaVietnameseApp.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserSearchService {

    private final ElasticSearchService elasticSearchService;

    private static final List<String> SEARCH_FIELDS = List.of("fullname", "email", "phone", "nickname");

    public Page<User> searchUsers(String keyword, int page, int size) {
        return elasticSearchService.search(User.class, keyword, SEARCH_FIELDS, null, page, size);
    }

    public void indexUser(User user) {
        elasticSearchService.index(user);
    }

    public void deleteUser(User user) {
        elasticSearchService.delete(user);
    }
}
