package com.connectJPA.LinguaVietnameseApp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LinguaVietnameseAppApplication {
	public static void main(String[] args) {
		SpringApplication app = new SpringApplication(LinguaVietnameseAppApplication.class);
		app.setAddCommandLineProperties(true);
		ConfigurableApplicationContext context = app.run(args);

		// Add shutdown hook to ensure graceful shutdown
		Runtime.getRuntime().addShutdownHook(new Thread(() -> {
			context.close();
			System.out.println("Application context closed gracefully");
		}));
	}

}
