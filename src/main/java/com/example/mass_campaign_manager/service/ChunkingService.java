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

        if (campaign.getStatus() != CampaignStatus.DRAFT && 
            campaign.getStatus() != CampaignStatus.FAILED &&
            campaign.getStatus() != CampaignStatus.SCHEDULED) {
            throw new RuntimeException("Only DRAFT, FAILED, or SCHEDULED campaigns can be launched. Current status: " + campaign.getStatus());
        }

        // 1. EVALUATE STATE BEFORE CHANGING IT
        boolean isRetry = (campaign.getStatus() == CampaignStatus.FAILED);
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
                if (isRetry) {
                    retryFailedChunksInBackground(campaignId);
                } else {
                    processChunksInBackground(campaignId, campaign.getChunkSize());
                }
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
                    log.error("Worker unresponsive (3 fails). Aborting and failing remaining chunks.");
                    
                    // SAVE ALL REMAINING BATCHES AS FAILED CHUNKS
                    for (int j = i + 1; j < batches.size(); j++) {
                        List<Recipient> skippedBatch = batches.get(j);
                        String skippedChunkId = UUID.randomUUID().toString();

                        CampaignChunk skippedChunk = CampaignChunk.builder()
                                .id(skippedChunkId)
                                .campaignId(campaignId)
                                .chunkIndex(j)
                                .status(ChunkStatus.FAILED) // Mark as failed instantly
                                .createdAt(System.currentTimeMillis())
                                .build();
                        campaignChunkRepository.save(skippedChunk);

                        skippedBatch.forEach(r -> r.setChunkId(skippedChunkId));
                        recipientRepository.saveAll(skippedBatch);
                    }
                    
                    // Force the Campaign itself to FAILED
                    Campaign failedCampaign = campaignRepository.findById(campaignId).orElseThrow();
                    failedCampaign.setStatus(CampaignStatus.FAILED);
                    failedCampaign.setCompletedAt(System.currentTimeMillis());
                    campaignRepository.save(failedCampaign);

                    break;
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

    private void retryFailedChunksInBackground(String campaignId) {
        log.info("Starting recovery engine for failed campaign {}", campaignId);
        
        List<CampaignChunk> allChunks = campaignChunkRepository.findByCampaignId(campaignId);
        
        // Find any chunk that is NOT completed
        List<CampaignChunk> chunksToRetry = allChunks.stream()
                .filter(c -> c.getStatus() != ChunkStatus.COMPLETED)
                .toList();

        if (chunksToRetry.isEmpty()) {
            log.warn("Campaign {} retry called, but no incomplete chunks found.", campaignId);
            return;
        }

        int successfulEnqueues = 0;
        int consecutiveFailures = 0;

        for (CampaignChunk chunk : chunksToRetry) {
            try {
                // Re-enqueue the exact same chunk ID
                String jobId = jobProcessorClient.enqueueChunkJob(chunk.getId());
                
                chunk.setJobId(jobId);
                chunk.setStatus(ChunkStatus.PENDING); // Reset back to pending
                campaignChunkRepository.save(chunk);
                
                successfulEnqueues++;
                consecutiveFailures = 0; 
            } catch (Exception e) {
                log.error("Retry failed for chunk {}: {}", chunk.getId(), e.getMessage());
                consecutiveFailures++;
                if (consecutiveFailures >= 3) {
                    log.error("Worker still unresponsive. Aborting retry.");
                    break; 
                }
            }
        }

        if (successfulEnqueues == 0) {
            log.error("Zero chunks enqueued on retry. Campaign {} stays FAILED.", campaignId);
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
