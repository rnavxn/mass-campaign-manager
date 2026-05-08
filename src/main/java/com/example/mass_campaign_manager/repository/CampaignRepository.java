package com.example.mass_campaign_manager.repository;

import com.example.mass_campaign_manager.entity.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CampaignRepository extends JpaRepository<Campaign, String> {}

