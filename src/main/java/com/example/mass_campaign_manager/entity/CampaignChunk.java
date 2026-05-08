package com.example.mass_campaign_manager.entity;

import com.example.mass_campaign_manager.enums.ChunkStatus;
import jakarta.persistence.*;

@Entity
@Table(name = "campaign_chunks")
public class CampaignChunk {
    @Id
    private String id; // UUID

    @Column(name = "campaign_id", nullable = false)
    private String campaignId;

    @Column(name = "job_id") // ID returned by dist-job-processor
    private String jobId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChunkStatus status; // PENDING, PROCESSING, COMPLETED, FAILED

    @Column(name = "chunk_index", nullable = false)
    private int chunkIndex; // 0, 1, 2... for ordering

    @Column(name = "processed_count")
    private int processedCount;

    @Column(name = "failed_count")
    private int failedCount;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @Column(name = "completed_at")
    private Long completedAt;
}