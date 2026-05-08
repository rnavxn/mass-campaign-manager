package com.example.mass_campaign_manager.repository;

import com.example.mass_campaign_manager.entity.Recipient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RecipientRepository extends JpaRepository<Recipient, String> {
    List<Recipient> findByCampaignId(String campaignId);
    int countByCampaignId(String campaignId);
}

