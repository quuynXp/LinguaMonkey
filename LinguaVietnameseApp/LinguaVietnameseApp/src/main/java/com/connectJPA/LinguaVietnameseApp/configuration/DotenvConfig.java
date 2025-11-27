// package com.connectJPA.LinguaVietnameseApp.configuration;

// import io.github.cdimascio.dotenv.Dotenv;
// import org.springframework.boot.SpringApplication;
// import org.springframework.boot.env.EnvironmentPostProcessor;
// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.core.env.ConfigurableEnvironment;
// import org.springframework.core.env.MapPropertySource;

// import java.util.HashMap;
// import java.util.Map;

// @Configuration
// public class DotenvConfig implements EnvironmentPostProcessor {
//     @Override
//     public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
//         Dotenv dotenv = Dotenv.configure()
//                 .directory("./")
//                 .ignoreIfMissing()
//                 .load();

//         Map<String, Object> envMap = new HashMap<>();
//         dotenv.entries().forEach(entry -> envMap.put(entry.getKey(), entry.getValue()));

//         environment.getPropertySources().addFirst(new MapPropertySource("dotenv", envMap));
//     }
// }

