package com.example.mass_campaign_manager.controller;

import com.example.mass_campaign_manager.dto.CreateCampaignRequest;
import com.example.mass_campaign_manager.dto.CampaignResponse;
import com.example.mass_campaign_manager.dto.UpdateCampaignSettingsRequest;
import com.example.mass_campaign_manager.entity.CampaignChunk;
import com.example.mass_campaign_manager.service.CampaignService;
import com.example.mass_campaign_manager.service.ChunkingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * REST API for managing mass communication campaigns.
 * Handles campaign creation, recipient ingestion, and lifecycle management.
 */
@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;
    private final ChunkingService chunkingService;

    /**
     * Initializes a new campaign in DRAFT state.
     */
    @PostMapping
    public ResponseEntity<CampaignResponse> createCampaign(@Valid @RequestBody CreateCampaignRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignService.createCampaign(req));
    }

    /**
     * Retrieves a summarized list of all campaigns for the dashboard view.
     */
    @GetMapping
    public ResponseEntity<List<CampaignResponse>> getAllCampaigns() {
        return ResponseEntity.ok(campaignService.getAllCampaigns());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CampaignResponse> getCampaign(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.getCampaign(id));
    }

    /**
     * Hard deletes a DRAFT campaign and all associated pending recipients.
     * Cannot be used on ACTIVE or COMPLETED campaigns.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCampaign(@PathVariable String id) {
        campaignService.deleteCampaign(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Streams a CSV file into the database, batching recipients into buckets.
     * Replaces any existing recipients for the target campaign.
     */
    @PostMapping("/{id}/recipients")
    public ResponseEntity<CampaignResponse> uploadRecipients(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(campaignService.uploadRecipients(id, file));
    }

    /**
     * Locks the campaign, chunks the recipients into groups of `chunkSize`, 
     * and dispatches them to the Distributed Job Processor (DJP) cluster.
     */
    @PostMapping("/{id}/launch")
    public ResponseEntity<Void> launchCampaign(@PathVariable String id) {
        chunkingService.launchCampaign(id);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}/chunks")
    public ResponseEntity<List<CampaignChunk>> getCampaignChunks(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.getCampaignChunks(id));
    }

    /**
     * Updates the execution settings (chunk size, rate limit) of a draft campaign.
     * Called by the frontend UI when a user modifies settings prior to launch.
     */
    @PutMapping("/{id}/settings")
    public ResponseEntity<CampaignResponse> updateCampaignSettings(
            @PathVariable String id,
            @RequestBody UpdateCampaignSettingsRequest request) {

        CampaignResponse updatedCampaign = campaignService.updateCampaignSettings(
                id,
                request.getChunkSize(),
                request.getRateLimitPerSecond()
        );

        return ResponseEntity.ok(updatedCampaign);
    }
}