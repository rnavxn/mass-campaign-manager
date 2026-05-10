package com.example.mass_campaign_manager.repository;

import com.example.mass_campaign_manager.entity.CampaignChunk;
import com.example.mass_campaign_manager.enums.ChunkStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CampaignChunkRepository extends JpaRepository<CampaignChunk, String> {

    List<CampaignChunk> findByCampaignId(String campaignId);

    long countByCampaignIdAndStatusNotIn(String campaignId, List<ChunkStatus> statuses);

}
