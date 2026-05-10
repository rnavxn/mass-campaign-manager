package com.example.mass_campaign_manager.dto;
 
import lombok.Data;
 
@Data
public class WebhookRequest {
    private String jobId;
    private String payload; // this is the chunkId
}