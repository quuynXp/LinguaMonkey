package com.connectJPA.LinguaVietnameseApp.configuration;

import org.quartz.spi.JobFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.quartz.SpringBeanJobFactory;

@Configuration
public class JobFactoryConfig {

    private final ApplicationContext applicationContext;

    public JobFactoryConfig(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }

    @Bean
    public JobFactory jobFactory() {
        SpringBeanJobFactory jobFactory = new SpringBeanJobFactory();
        jobFactory.setApplicationContext(applicationContext);
        return jobFactory;
    }
}