package com.example.mass_campaign_manager.service;

import com.example.mass_campaign_manager.entity.Campaign;
import com.example.mass_campaign_manager.enums.CampaignStatus;
import com.example.mass_campaign_manager.repository.CampaignRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CampaignScheduler {

    private final CampaignRepository campaignRepository;
    private final ChunkingService chunkingService;

    // Runs every 10 seconds (10,000 milliseconds)
    @Scheduled(fixedDelay = 10000)
    public void wakeUpScheduledCampaigns() {
        long now = System.currentTimeMillis();
        
        List<Campaign> dueCampaigns = campaignRepository
                .findByStatusAndScheduledAtLessThanEqual(CampaignStatus.SCHEDULED, now);

        for (Campaign campaign : dueCampaigns) {
            log.info("Auto-launching scheduled campaign: {}", campaign.getId());
            try {
                // We call the same launch method the frontend uses
                chunkingService.launchCampaign(campaign.getId());
            } catch (Exception e) {
                log.error("Failed to auto-launch campaign {}", campaign.getId(), e);
            }
        }
    }
}