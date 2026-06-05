package com.example.mass_campaign_manager.repository;

import com.example.mass_campaign_manager.entity.Recipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface RecipientRepository extends JpaRepository<Recipient, String> {

    List<Recipient> findByCampaignId(String campaignId);

    int countByCampaignId(String campaignId);

    List<Recipient> findByChunkId(String chunkId);

    /**
     * Executes a native bulk delete bypassing Hibernate's standard lifecycle.
     * Standard delete/deleteAll loads every record into memory before deleting, 
     * which causes OutOfMemory crashes for massive campaigns (1M+ records).
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM Recipient r WHERE r.campaignId = :campaignId")
    void bulkDeleteByCampaignId(String campaignId);

}

