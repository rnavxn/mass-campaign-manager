package com.example.mass_campaign_manager.entity;

import com.example.mass_campaign_manager.enums.RecipientStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "recipients")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recipient {
    @Id
    private String id;

    @Column(name = "campaign_id", nullable = false)
    private String campaignId;

    @Column(name = "chunk_id")          // nullable = false REMOVED
    private String chunkId;

    @Column(nullable = false)
    private String contact;

    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecipientStatus status;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "processed_at")
    private Long processedAt;
}