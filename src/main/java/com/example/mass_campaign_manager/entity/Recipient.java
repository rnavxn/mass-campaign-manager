package com.example.mass_campaign_manager.entity;

import com.example.mass_campaign_manager.enums.RecipientStatus;
import jakarta.persistence.*;

@Entity
@Table(name = "recipients")
public class Recipient {
    @Id
    private String id; // UUID

    @Column(name = "campaign_id", nullable = false)
    private String campaignId;

    @Column(name = "chunk_id", nullable = false)
    private String chunkId;

    @Column(nullable = false)
    private String contact; // email address or phone number

    private String name; // for template personalization

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecipientStatus status; // PENDING, SENT, FAILED

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "processed_at")
    private Long processedAt;
}
