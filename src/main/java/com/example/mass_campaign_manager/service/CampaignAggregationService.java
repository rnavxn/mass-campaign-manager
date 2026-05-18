package com.example.mass_campaign_manager.service;

import com.example.mass_campaign_manager.entity.Campaign;
import com.example.mass_campaign_manager.entity.CampaignChunk;
import com.example.mass_campaign_manager.enums.CampaignStatus;
import com.example.mass_campaign_manager.enums.ChunkStatus;
import com.example.mass_campaign_manager.event.CampaignCompletionEvent;
import com.example.mass_campaign_manager.repository.CampaignChunkRepository;
import com.example.mass_campaign_manager.repository.CampaignRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CampaignAggregationService {

    private final CampaignRepository campaignRepository;
    private final CampaignChunkRepository campaignChunkRepository;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void aggregate(CampaignCompletionEvent event) {
        String campaignId = event.campaignId();

        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        List<CampaignChunk> allChunks = campaignChunkRepository.findByCampaignId(campaignId);

        int totalProcessed = allChunks.stream()
                .mapToInt(CampaignChunk::getProcessedCount).sum();
        int totalFailed = allChunks.stream()
                .mapToInt(CampaignChunk::getFailedCount).sum();

        campaign.setProcessedRecipients(totalProcessed);
        campaign.setFailedRecipients(totalFailed);

        boolean allDone = allChunks.stream()
                .allMatch(c -> c.getStatus() == ChunkStatus.COMPLETED
                        || c.getStatus() == ChunkStatus.FAILED);

        if (allDone) {
            boolean anyCompleted = allChunks.stream()
                    .anyMatch(c -> c.getStatus() == ChunkStatus.COMPLETED);
            campaign.setStatus(anyCompleted ? CampaignStatus.COMPLETED : CampaignStatus.FAILED);
            campaign.setCompletedAt(System.currentTimeMillis());
            log.info("Campaign {} → {} ({} sent, {} failed)",
                    campaignId, campaign.getStatus(), totalProcessed, totalFailed);
        }

        campaignRepository.save(campaign);
    }
}