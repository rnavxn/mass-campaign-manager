package com.example.mass_campaign_manager.service;
 
import com.example.mass_campaign_manager.entity.CampaignChunk;
import com.example.mass_campaign_manager.entity.Recipient;
import com.example.mass_campaign_manager.enums.ChunkStatus;
import com.example.mass_campaign_manager.enums.RecipientStatus;
import com.example.mass_campaign_manager.repository.CampaignChunkRepository;
import com.example.mass_campaign_manager.repository.RecipientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
 
import java.util.List;
 
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
 
    private final CampaignChunkRepository campaignChunkRepository;
    private final RecipientRepository recipientRepository;
 
    /**
     * Entry point called by the webhook controller.
     * jobId  — from DJP, stored for traceability
     * chunkId — the payload DJP echoes back, used to look up recipients
     */
    public void processChunk(String jobId, String chunkId) {
        CampaignChunk chunk = campaignChunkRepository.findById(chunkId)
                .orElseThrow(() -> new RuntimeException("Chunk not found: " + chunkId));
 
        if (chunk.getStatus() == ChunkStatus.COMPLETED) {
            // DJP's idempotency should prevent this, but guard anyway
            log.warn("Chunk {} already completed, skipping", chunkId);
            return;
        }
 
        chunk.setStatus(ChunkStatus.PROCESSING);
        campaignChunkRepository.save(chunk);
 
//        List<Recipient> recipients = recipientRepository.findByCampaignId(chunk.getCampaignId())
//                .stream()
//                .filter(r -> chunkId.equals(r.getChunkId()))
//                .toList();
        List<Recipient> recipients = recipientRepository.findByChunkId(chunkId);
 
        log.info("Processing chunk {} ({} recipients) for job {}", chunkId, recipients.size(), jobId);
 
        int processed = 0;
        int failed = 0;
 
        for (Recipient recipient : recipients) {
            try {
                applyRateLimit(chunk.getCampaignId());
                mockDispatch(recipient);
 
                recipient.setStatus(RecipientStatus.SENT);
                recipient.setProcessedAt(System.currentTimeMillis());
                processed++;
            } catch (Exception e) {
                log.error("Failed to dispatch to recipient {}: {}", recipient.getContact(), e.getMessage());
                recipient.setStatus(RecipientStatus.FAILED);
                recipient.setErrorMessage(e.getMessage());
                recipient.setProcessedAt(System.currentTimeMillis());
                failed++;
            }
            recipientRepository.save(recipient);
        }
 
        chunk.setProcessedCount(processed);
        chunk.setFailedCount(failed);
        chunk.setStatus(failed == recipients.size() ? ChunkStatus.FAILED : ChunkStatus.COMPLETED);
        chunk.setCompletedAt(System.currentTimeMillis());
        campaignChunkRepository.save(chunk);
 
        log.info("Chunk {} done — {} sent, {} failed", chunkId, processed, failed);
    }
 
    // ── internals ────────────────────────────────────────────────────────────
 
    private void mockDispatch(Recipient recipient) {
        // mock send — replace with real email/SMS client in production
        log.info("Dispatching to {} ({})", recipient.getContact(), recipient.getName());
 
        // simulate occasional failure (~10%)
        if (Math.random() < 0.1) {
            throw new RuntimeException("Simulated dispatch failure");
        }
    }
 
    private void applyRateLimit(String campaignId) {
        // rate limit is per-campaign, stored on Campaign entity
        // fetching it here would need CampaignRepository injected
        // for now: fixed 100ms sleep = ~10 sends/sec, matches default rateLimitPerSecond
        // Phase 5 will wire this to the actual campaign.rateLimitPerSecond value
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}