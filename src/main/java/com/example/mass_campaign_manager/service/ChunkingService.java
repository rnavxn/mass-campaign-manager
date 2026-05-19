package com.example.mass_campaign_manager.service;

import com.example.mass_campaign_manager.client.JobProcessorClient;
import com.example.mass_campaign_manager.entity.Campaign;
import com.example.mass_campaign_manager.entity.CampaignChunk;
import com.example.mass_campaign_manager.entity.Recipient;
import com.example.mass_campaign_manager.enums.CampaignStatus;
import com.example.mass_campaign_manager.enums.ChunkStatus;
import com.example.mass_campaign_manager.repository.CampaignChunkRepository;
import com.example.mass_campaign_manager.repository.CampaignRepository;
import com.example.mass_campaign_manager.repository.RecipientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChunkingService {

    private final CampaignRepository campaignRepository;
    private final CampaignChunkRepository campaignChunkRepository;
    private final RecipientRepository recipientRepository;
    private final JobProcessorClient jobProcessorClient;

    public void launchCampaign(String campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        if (campaign.getStatus() != CampaignStatus.DRAFT) {
            throw new RuntimeException("Only DRAFT campaigns can be launched. Current status: " + campaign.getStatus());
        }

        // 1. Check if it's scheduled for the future
        boolean isScheduled = campaign.getScheduledAt() != null
                && campaign.getScheduledAt() > System.currentTimeMillis();

        // 2. INSTANTLY flip status and save to database
        campaign.setStatus(isScheduled ? CampaignStatus.SCHEDULED : CampaignStatus.RUNNING);
        campaignRepository.save(campaign);
        log.info("Campaign {} set to {}", campaignId, campaign.getStatus());

        // 3. If scheduled, STOP here. (Fixes the Ghost Scheduling bug)
        if (isScheduled) {
            log.info("Campaign {} is scheduled for future. Skipping chunk generation.", campaignId);
            return; 
        }

        // 4. FIRE AND FORGET: Spin up a background thread for the heavy lifting
        CompletableFuture.runAsync(() -> {
            try {
                processChunksInBackground(campaignId, campaign.getChunkSize());
            } catch (Exception e) {
                log.error("Fatal error processing chunks for campaign {}", campaignId, e);
            }
        });
    }
    // ── internals ────────────────────────────────────────────────────────────

    private void processChunksInBackground(String campaignId, int chunkSize) {
        // Re-fetch recipients in the background thread
        List<Recipient> recipients = recipientRepository.findByCampaignId(campaignId);
        if (recipients.isEmpty()) {
            log.warn("Campaign {} has no recipients to process.", campaignId);
            return;
        }

        List<List<Recipient>> batches = partition(recipients, chunkSize);
        log.info("Background Worker started for {} — {} recipients → {} chunks", campaignId, recipients.size(), batches.size());

        int successfulEnqueues = 0;
        int consecutiveFailures = 0;

        for (int i = 0; i < batches.size(); i++) {
            List<Recipient> batch = batches.get(i);
            String chunkId = UUID.randomUUID().toString();

            CampaignChunk chunk = CampaignChunk.builder()
                    .id(chunkId)
                    .campaignId(campaignId)
                    .chunkIndex(i)
                    .status(ChunkStatus.PENDING)
                    .createdAt(System.currentTimeMillis())
                    .build();
            campaignChunkRepository.save(chunk);

            batch.forEach(r -> r.setChunkId(chunkId));
            recipientRepository.saveAll(batch);

            try {
                String jobId = jobProcessorClient.enqueueChunkJob(chunkId);
                chunk.setJobId(jobId);
                campaignChunkRepository.save(chunk);
                
                successfulEnqueues++;
                consecutiveFailures = 0; // Reset circuit breaker
            } catch (Exception e) {
                log.error("Failed to enqueue chunk {} (index {}): {}", chunkId, i, e.getMessage());
                chunk.setStatus(ChunkStatus.FAILED);
                campaignChunkRepository.save(chunk);
                
                consecutiveFailures++;
                if (consecutiveFailures >= 3) {
                    log.error("Worker unresponsive (3 consecutive fails). Aborting campaign {}.", campaignId);
                    break; // Trip the circuit breaker!
                }
            }
        }

        // If the circuit breaker tripped on the very first chunks, mark campaign as FAILED
        if (successfulEnqueues == 0) {
            log.error("Zero chunks enqueued. Failing campaign {} instantly.", campaignId);
            // Re-fetch campaign to avoid detached entity state in the async thread
            Campaign failedCampaign = campaignRepository.findById(campaignId).orElseThrow();
            failedCampaign.setStatus(CampaignStatus.FAILED);
            failedCampaign.setCompletedAt(System.currentTimeMillis());
            campaignRepository.save(failedCampaign);
        }
    }

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            partitions.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return partitions;
    }
}
