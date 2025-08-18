package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.MoveRequest;
import com.connectJPA.LinguaVietnameseApp.service.CloudinaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final CloudinaryService moveService;

    public MediaController(CloudinaryService moveService) {
        this.moveService = moveService;
    }

    @PostMapping("/move")
    public ResponseEntity<?> move(@RequestBody MoveRequest req) throws Exception {
        var res = moveService.move(req);
        return ResponseEntity.ok(res);
    }
}

