package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MindMapNode {
    private String id;
    private String title;
    private String description;
    private Double x;
    private Double y;
    private String color;
    private Integer level;
    private List<String> children;
    private List<String> examples;
    private List<String> rules;
    private String type;
}
