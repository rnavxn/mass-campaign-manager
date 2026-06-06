package com.example.mass_campaign_manager.dto;

import lombok.Data;

/**
 * DTO for catching state changes from the UI before campaign launch.
 */
@Data
public class UpdateCampaignSettingsRequest {
    private int chunkSize;
    private int rateLimitPerSecond;
}