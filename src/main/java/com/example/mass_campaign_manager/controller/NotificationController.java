package com.example.mass_campaign_manager.controller;
 
import com.example.mass_campaign_manager.dto.WebhookRequest;
import com.example.mass_campaign_manager.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/internal/worker")
@RequiredArgsConstructor
public class NotificationController {
 
    private final NotificationService notificationService;
 
    @PostMapping("/process-chunk")
    public ResponseEntity<Void> processChunk(@RequestBody WebhookRequest request) {
        log.info("Webhook received — jobId={}, chunkId={}", request.getJobId(), request.getPayload());
        notificationService.processChunk(request.getJobId(), request.getPayload());
        return ResponseEntity.ok().build();
    }
}