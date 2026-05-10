
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

    public CampaignResponse uploadRecipients(String campaignId, MultipartFile file) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("Campaign not found: " + campaignId));

        if (campaign.getStatus() != CampaignStatus.DRAFT) {
            throw new RuntimeException("Recipients can only be uploaded to DRAFT campaigns");
        }

        List<Recipient> recipients = parseCSV(file, campaignId);

        // wipe existing recipients for this campaign before re-upload
        recipientRepository.findByCampaignId(campaignId)
                .forEach(recipientRepository::delete);

        recipientRepository.saveAll(recipients);

        campaign.setTotalRecipients(recipients.size());
        campaignRepository.save(campaign);

        return toResponse(campaign);
    }

    public List<CampaignChunk> getCampaignChunks(String campaignId) {
        return campaignChunkRepository.findByCampaignId(campaignId);
    }

    // ── internals ────────────────────────────────────────────────────────────

    private List<Recipient> parseCSV(MultipartFile file, String campaignId) {
        List<Recipient> recipients = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String header = reader.readLine(); // skip header row
            if (header == null) throw new RuntimeException("CSV file is empty");

            String line;
            while ((line = reader.readLine()) != null) {
                String[] cols = line.split(",", -1);
                if (cols.length < 1 || cols[0].isBlank()) continue; // skip bad rows

                String contact = cols[0].trim();
                String name = cols.length > 1 ? cols[1].trim() : null;

                recipients.add(Recipient.builder()
                        .id(UUID.randomUUID().toString())
                        .campaignId(campaignId)
                        .contact(contact)
                        .name(name)
                        .status(RecipientStatus.PENDING)
                        .build());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse CSV: " + e.getMessage());
        }

        if (recipients.isEmpty()) throw new RuntimeException("CSV has no valid recipients");
        return recipients;
    }

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