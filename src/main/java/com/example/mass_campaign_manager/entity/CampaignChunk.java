package com.example.mass_campaign_manager.entity;

import com.example.mass_campaign_manager.enums.ChunkStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "campaign_chunks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignChunk {
    @Id
    private String id;

    @Column(name = "campaign_id", nullable = false)
    private String campaignId;

    @Column(name = "job_id")
    private String jobId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChunkStatus status;

    @Column(name = "chunk_index", nullable = false)
    private int chunkIndex;

    @Column(name = "processed_count")
    private int processedCount;

    @Column(name = "failed_count")
    private int failedCount;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "completed_at")
    private Long completedAt;
}