package com.connectJPA.LinguaVietnameseApp;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
@EnableJpaRepositories(basePackages = "com.connectJPA.LinguaVietnameseApp.repository.jpa")
public class LinguaVietnameseAppApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(LinguaVietnameseAppApplication.class);
        app.setAddCommandLineProperties(true);
        ConfigurableApplicationContext context = app.run(args);

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            context.close();
            System.out.println("Application context closed gracefully");
        }));
    }

    // FIX: Thiết lập múi giờ mặc định là Việt Nam để Scheduler chạy đúng giờ
    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        System.out.println("Current TimeZone set to: " + TimeZone.getDefault().getID());
    }
}