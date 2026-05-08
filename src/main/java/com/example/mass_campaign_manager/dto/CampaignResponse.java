// CampaignResponse.java
package com.example.mass_campaign_manager.dto;

import com.example.mass_campaign_manager.enums.CampaignChannel;
import com.example.mass_campaign_manager.enums.CampaignStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CampaignResponse {
    private String id;
    private String name;
    private CampaignStatus status;
    private CampaignChannel channel;
    private int totalRecipients;
    private int processedRecipients;
    private int failedRecipients;
    private int chunkSize;
    private int rateLimitPerSecond;
    private Long scheduledAt;
    private Long createdAt;
    private Long completedAt;
    private String messageTemplate;
}