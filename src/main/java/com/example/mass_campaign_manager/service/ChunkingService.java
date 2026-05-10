
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
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChunkingService {

    private final CampaignRepository campaignRepository;
    private final CampaignChunkRepository campaignChunkRepository;
    private final RecipientRepository recipientRepository;
    private final JobProcessorClient jobProcessorClient;

    @Transactional
    public void launchCampaign(String campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        if (campaign.getStatus() != CampaignStatus.DRAFT) {
            throw new RuntimeException("Only DRAFT campaigns can be launched. Current status: " + campaign.getStatus());
        }

        List<Recipient> recipients = recipientRepository.findByCampaignId(campaignId);
        if (recipients.isEmpty()) {
            throw new RuntimeException("Campaign has no recipients. Upload a CSV first.");
        }

        List<List<Recipient>> batches = partition(recipients, campaign.getChunkSize());
        log.info("Launching campaign {} — {} recipients → {} chunks", campaignId, recipients.size(), batches.size());

        for (int i = 0; i < batches.size(); i++) {
            List<Recipient> batch = batches.get(i);
            String chunkId = UUID.randomUUID().toString();

            // 1. persist the chunk row
            CampaignChunk chunk = CampaignChunk.builder()
                    .id(chunkId)
                    .campaignId(campaignId)
                    .chunkIndex(i)
                    .status(ChunkStatus.PENDING)
                    .createdAt(System.currentTimeMillis())
                    .build();
            campaignChunkRepository.save(chunk);

            // 2. assign chunkId back to recipients
            batch.forEach(r -> r.setChunkId(chunkId));
            recipientRepository.saveAll(batch);

            // 3. submit job to dist-job-processor (payload = chunkId)
            try {
                String jobId = jobProcessorClient.enqueueChunkJob(chunkId);
                chunk.setJobId(jobId);
                campaignChunkRepository.save(chunk);
            } catch (Exception e) {
                // if enqueue fails for a chunk, mark it failed and continue
                // campaign still launches — failed chunks are visible in DB
                log.error("Failed to enqueue chunk {} (index {}): {}", chunkId, i, e.getMessage());
                chunk.setStatus(ChunkStatus.FAILED);
                campaignChunkRepository.save(chunk);
            }
        }

        // 4. flip campaign status
        boolean isScheduled = campaign.getScheduledAt() != null
                && campaign.getScheduledAt() > System.currentTimeMillis();

        campaign.setStatus(isScheduled ? CampaignStatus.SCHEDULED : CampaignStatus.RUNNING);
        campaignRepository.save(campaign);

        log.info("Campaign {} launched with status {}", campaignId, campaign.getStatus());
    }

    // ── internals ────────────────────────────────────────────────────────────

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            partitions.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return partitions;
    }
}
