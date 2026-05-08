package com.example.mass_campaign_manager.entity;

import com.example.mass_campaign_manager.enums.CampaignChannel;
import com.example.mass_campaign_manager.enums.CampaignStatus;
import jakarta.persistence.*;

@Entity
@Table(name = "campaigns")
public class Campaign {
    @Id
    private String id; // UUID

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CampaignStatus status; // DRAFT, SCHEDULED, RUNNING, COMPLETED, FAILED

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CampaignChannel channel; // EMAIL or SMS

    @Column(name = "total_recipients")
    private int totalRecipients;

    @Column(name = "processed_recipients")
    private int processedRecipients;

    @Column(name = "failed_recipients")
    private int failedRecipients;

    @Column(name = "chunk_size", nullable = false)
    private int chunkSize; // default 50

    @Column(name = "rate_limit_per_second", nullable = false)
    private int rateLimitPerSecond; // default 10

    @Column(name = "scheduled_at")
    private Long scheduledAt; // epoch ms, null = send immediately

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "completed_at")
    private Long completedAt;

    @Column(name = "message_template", columnDefinition = "TEXT")
    private String messageTemplate; // "Hello {name}, your order is confirmed"
}