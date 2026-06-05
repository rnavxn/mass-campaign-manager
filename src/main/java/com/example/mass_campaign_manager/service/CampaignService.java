package com.example.mass_campaign_manager.service;

import com.example.mass_campaign_manager.config.CampaignConstants;
import com.example.mass_campaign_manager.dto.CreateCampaignRequest;
import com.example.mass_campaign_manager.dto.CampaignResponse;
import com.example.mass_campaign_manager.entity.Campaign;
import com.example.mass_campaign_manager.entity.CampaignChunk;
import com.example.mass_campaign_manager.entity.Recipient;
import com.example.mass_campaign_manager.enums.CampaignStatus;
import com.example.mass_campaign_manager.enums.RecipientStatus;
import com.example.mass_campaign_manager.repository.CampaignChunkRepository;
import com.example.mass_campaign_manager.repository.CampaignRepository;
import com.example.mass_campaign_manager.repository.RecipientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CampaignChunkRepository campaignChunkRepository;
    private final RecipientRepository recipientRepository;

    public CampaignResponse createCampaign(CreateCampaignRequest req) {
        int chunkSize = req.getChunkSize() > 0 ? req.getChunkSize() : CampaignConstants.DEFAULT_CHUNK_SIZE;
        int rateLimit = req.getRateLimitPerSecond() > 0 ? req.getRateLimitPerSecond() : CampaignConstants.DEFAULT_RATE_LIMIT_PER_SECOND;

        Campaign campaign = Campaign.builder()
                .id(UUID.randomUUID().toString())
                .name(req.getName())
                .channel(req.getChannel())
                .messageTemplate(req.getMessageTemplate())
                .chunkSize(chunkSize)
                .rateLimitPerSecond(rateLimit)
                .scheduledAt(req.getScheduledAt())
                .status(CampaignStatus.DRAFT)
                .createdAt(System.currentTimeMillis())
                .build();

        campaignRepository.save(campaign);
        return toResponse(campaign);
    }

    public List<CampaignResponse> getAllCampaigns() {
        return campaignRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public CampaignResponse getCampaign(String id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + id));
        return toResponse(campaign);
    }

    public void deleteCampaign(String id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + id));

        if (campaign.getStatus() != CampaignStatus.DRAFT) {
            throw new RuntimeException("Only DRAFT campaigns can be deleted");
        }

        recipientRepository.findByCampaignId(id).forEach(r -> recipientRepository.delete(r));
        campaignRepository.delete(campaign);
    }

    /**
     * Parses and persists a massive CSV of recipients using a memory-efficient streaming approach.
     * * @param campaignId The target DRAFT campaign.
     * @param file The uploaded MultipartFile (expected to be CSV).
     * @return CampaignResponse reflecting the new total recipient count.
     */
    @Transactional
    public CampaignResponse uploadRecipients(String campaignId, MultipartFile file) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));
    
        if (campaign.getStatus() != CampaignStatus.DRAFT) {
            throw new RuntimeException("Recipients can only be uploaded to DRAFT campaigns");
        }

        // 1. Wipe existing recipients instantly via native SQL to prevent memory exhaustion
        recipientRepository.bulkDeleteByCampaignId(campaignId);
    
        int totalProcessed = 0;
        int batchSize = 5000;

        // Pre-allocate array capacity to prevent underlying array resizing overhead
        List<Recipient> batch = new ArrayList<>(batchSize);

        // 2. Use BufferedReader to stream the file line-by-line instead of loading the entire file into RAM
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String header = reader.readLine(); // skip header row
            if (header == null) throw new RuntimeException("CSV file is empty");
    
            String line;
            while ((line = reader.readLine()) != null) {
                String[] cols = line.split(",", -1);

                // Skip completely empty lines or rows missing the primary contact field
                if (cols.length < 1 || cols[0].isBlank()) continue;
    
                String contact = cols[0].trim();
                String name = cols.length > 1 ? cols[1].trim() : null;
    
                batch.add(Recipient.builder()
                        .id(UUID.randomUUID().toString())
                        .campaignId(campaignId)
                        .contact(contact)
                        .name(name)
                        .status(RecipientStatus.PENDING)
                        .build());
                
                totalProcessed++;

                // 3. JDBC Batch Insert: Once bucket is full, flush to DB and clear memory
                if (batch.size() >= batchSize) {
                    recipientRepository.saveAll(batch);
                    batch.clear(); 
                }
            }

            // 4. Flush any remaining records that didn't perfectly fill the final batch
            if (!batch.isEmpty()) {
                recipientRepository.saveAll(batch);
                batch.clear();
            }
    
        } catch (Exception e) {
            throw new RuntimeException("Failed to stream CSV: " + e.getMessage());
        }
    
        if (totalProcessed == 0) throw new RuntimeException("CSV has no valid recipients");

        // 5. Update the campaign's source-of-truth metadata
        campaign.setTotalRecipients(totalProcessed);
        campaignRepository.save(campaign);
    
        return toResponse(campaign);
    }
    
    public List<CampaignChunk> getCampaignChunks(String campaignId) {
        return campaignChunkRepository.findByCampaignId(campaignId);
    }

    // ── internals ────────────────────────────────────────────────────────────

    private CampaignResponse toResponse(Campaign c) {
        return CampaignResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .status(c.getStatus())
                .channel(c.getChannel())
                .totalRecipients(c.getTotalRecipients())
                .processedRecipients(c.getProcessedRecipients())
                .failedRecipients(c.getFailedRecipients())
                .chunkSize(c.getChunkSize())
                .rateLimitPerSecond(c.getRateLimitPerSecond())
                .scheduledAt(c.getScheduledAt())
                .createdAt(c.getCreatedAt())
                .completedAt(c.getCompletedAt())
                .messageTemplate(c.getMessageTemplate())
                .build();
    }
}