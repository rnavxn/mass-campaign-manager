package com.example.mass_campaign_manager.entity;

import com.example.mass_campaign_manager.enums.CampaignChannel;
import com.example.mass_campaign_manager.enums.CampaignStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "campaigns")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Campaign {
    @Id
    private String id;   // UUID

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CampaignStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CampaignChannel channel;

    @Column(name = "total_recipients")
    private int totalRecipients;

    @Column(name = "processed_recipients")
    private int processedRecipients;

    @Column(name = "failed_recipients")
    private int failedRecipients;

    @Column(name = "chunk_size", nullable = false)
    private int chunkSize;

    @Column(name = "rate_limit_per_second", nullable = false)
    private int rateLimitPerSecond;

    @Column(name = "scheduled_at")
    private Long scheduledAt;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "completed_at")
    private Long completedAt;

    @Column(name = "message_template", columnDefinition = "TEXT")
    private String messageTemplate;
}