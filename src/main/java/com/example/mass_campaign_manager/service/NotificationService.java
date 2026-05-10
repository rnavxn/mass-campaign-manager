package com.example.mass_campaign_manager.service;
 
import com.example.mass_campaign_manager.entity.Campaign;
import com.example.mass_campaign_manager.entity.CampaignChunk;
import com.example.mass_campaign_manager.entity.Recipient;
import com.example.mass_campaign_manager.enums.CampaignStatus;
import com.example.mass_campaign_manager.enums.ChunkStatus;
import com.example.mass_campaign_manager.enums.RecipientStatus;
import com.example.mass_campaign_manager.repository.CampaignChunkRepository;
import com.example.mass_campaign_manager.repository.CampaignRepository;
import com.example.mass_campaign_manager.repository.RecipientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
 
import java.util.List;
 
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
 
    private final CampaignChunkRepository campaignChunkRepository;
    private final CampaignRepository campaignRepository;
    private final RecipientRepository recipientRepository;
 
    @Transactional
    public void processChunk(String jobId, String chunkId) {
        CampaignChunk chunk = campaignChunkRepository.findById(chunkId)
                .orElseThrow(() -> new RuntimeException("Chunk not found: " + chunkId));
 
        if (chunk.getStatus() == ChunkStatus.COMPLETED) {
            log.warn("Chunk {} already completed, skipping", chunkId);
            return;
        }
 
        Campaign campaign = campaignRepository.findById(chunk.getCampaignId())
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + chunk.getCampaignId()));
 
        chunk.setStatus(ChunkStatus.PROCESSING);
        campaignChunkRepository.save(chunk);
 
        List<Recipient> recipients = recipientRepository.findByChunkId(chunkId);
 
        log.info("Processing chunk {} ({} recipients) for job {}", chunkId, recipients.size(), jobId);
 
        int processed = 0;
        int failed = 0;
 
        for (Recipient recipient : recipients) {
            try {
                applyRateLimit(campaign.getRateLimitPerSecond()); // Phase 5 fix: real rate limit
                mockDispatch(recipient);
 
                recipient.setStatus(RecipientStatus.SENT);
                recipient.setProcessedAt(System.currentTimeMillis());
                processed++;
            } catch (Exception e) {
                log.error("Failed to dispatch to {}: {}", recipient.getContact(), e.getMessage());
                recipient.setStatus(RecipientStatus.FAILED);
                recipient.setErrorMessage(e.getMessage());
                recipient.setProcessedAt(System.currentTimeMillis());
                failed++;
            }
            recipientRepository.save(recipient);
        }
 
        // update chunk
        chunk.setProcessedCount(processed);
        chunk.setFailedCount(failed);
        chunk.setStatus(failed == recipients.size() ? ChunkStatus.FAILED : ChunkStatus.COMPLETED);
        chunk.setCompletedAt(System.currentTimeMillis());
        campaignChunkRepository.save(chunk);
 
        log.info("Chunk {} done — {} sent, {} failed", chunkId, processed, failed);

        aggregateToCampaign(campaign);
    }
 
    // ── internals ────────────────────────────────────────────────────────────
 
    private void aggregateToCampaign(Campaign campaign) {
        List<CampaignChunk> allChunks = campaignChunkRepository.findByCampaignId(campaign.getId());
 
        int totalProcessed = allChunks.stream().mapToInt(CampaignChunk::getProcessedCount).sum();
        int totalFailed = allChunks.stream().mapToInt(CampaignChunk::getFailedCount).sum();
 
        campaign.setProcessedRecipients(totalProcessed);
        campaign.setFailedRecipients(totalFailed);
 
        // check if all chunks are in a terminal state
        boolean allDone = allChunks.stream()
                .allMatch(c -> c.getStatus() == ChunkStatus.COMPLETED
                        || c.getStatus() == ChunkStatus.FAILED);
 
        if (allDone) {
            boolean allFailed = allChunks.stream()
                    .allMatch(c -> c.getStatus() == ChunkStatus.FAILED);
 
            campaign.setStatus(allFailed ? CampaignStatus.FAILED : CampaignStatus.COMPLETED);
            campaign.setCompletedAt(System.currentTimeMillis());
 
            log.info("Campaign {} finished with status {} — {}/{} sent",
                    campaign.getId(),
                    campaign.getStatus(),
                    totalProcessed,
                    campaign.getTotalRecipients());
        }
 
        campaignRepository.save(campaign);
    }
 
    private void mockDispatch(Recipient recipient) {
        log.info("Dispatching to {} ({})", recipient.getContact(), recipient.getName());
        if (Math.random() < 0.1) {
            throw new RuntimeException("Simulated dispatch failure");
        }
    }
 
    private void applyRateLimit(int rateLimitPerSecond) {
        // rateLimitPerSecond = 10 → 100ms per send
        // rateLimitPerSecond = 5  → 200ms per send
        long sleepMs = 1000L / rateLimitPerSecond;
        try {
            Thread.sleep(sleepMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}