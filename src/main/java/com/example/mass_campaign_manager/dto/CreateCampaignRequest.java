package com.example.mass_campaign_manager.dto;

import com.example.mass_campaign_manager.enums.CampaignChannel;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateCampaignRequest {

    @NotBlank
    private String name;

    @NotNull
    private CampaignChannel channel;

    @NotBlank
    private String messageTemplate;

    @Min(1)
    private int chunkSize;          // 0 = use default from constants

    @Min(1)
    private int rateLimitPerSecond; // 0 = use default from constants

    private Long scheduledAt;       // null = send immediately
}