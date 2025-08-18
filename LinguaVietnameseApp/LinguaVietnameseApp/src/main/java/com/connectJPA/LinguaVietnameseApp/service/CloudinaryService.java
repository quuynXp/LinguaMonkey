package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.MoveRequest;

import java.util.Map;

public interface CloudinaryService {
    public Map<?, ?> move(MoveRequest req);
}
