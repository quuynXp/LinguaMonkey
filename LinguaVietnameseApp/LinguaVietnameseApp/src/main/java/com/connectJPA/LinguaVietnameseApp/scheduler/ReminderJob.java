// package com.connectJPA.LinguaVietnameseApp.scheduler;

// import com.connectJPA.LinguaVietnameseApp.service.ReminderService;
// import lombok.extern.slf4j.Slf4j;
// import org.quartz.Job;
// import org.quartz.JobExecutionContext;
// import org.springframework.stereotype.Component;

// @Slf4j
// @Component
// public class ReminderJob implements Job {

//     private final ReminderService reminderService;

//     public ReminderJob(ReminderService reminderService) {
//         this.reminderService = reminderService;
//     }

//     @Override
//     public void execute(JobExecutionContext context) {
//         log.info("[ReminderJob] Executing scheduled reminder job...");
//         try {
//             reminderService.runReminderJob();
//         } catch (Exception e) {
//             log.error("Error executing reminder job", e);
//         }
//     }
// }