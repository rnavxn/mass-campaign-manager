package com.example.mass_campaign_manager.client;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class JobProcessorClient {

    private final RestTemplate restTemplate;

    @Value("${job.processor.url}")
    private String jobProcessorUrl;

    @Value("${app.self.base-url}")
    private String selfBaseUrl;

    /**
     * Submits a chunk job to dist-job-processor.
     * payload  = chunkId (worker uses this to look up recipients)
     * callbackUrl = this app's webhook endpoint
     * idempotencyKey = null (DJP auto-generates via MD5(type+payload))
     *
     * @return jobId from dist-job-processor
     */
    public String enqueueChunkJob(String chunkId) {
        String callbackUrl = selfBaseUrl + "/api/internal/worker/process-chunk";

        JobEnqueueRequest request = new JobEnqueueRequest(
                "EMAIL_SEND",
                chunkId,
                null,           // let DJP auto-generate idempotency key
                callbackUrl
        );

        JobEnqueueResponse response = restTemplate.postForObject(
                jobProcessorUrl + "/api/jobs/enqueue",
                request,
                JobEnqueueResponse.class
        );

        if (response == null || response.getId() == null) {
            throw new RuntimeException("dist-job-processor returned empty response for chunkId: " + chunkId);
        }

        log.info("Enqueued job {} for chunk {}", response.getId(), chunkId);
        return response.getId();
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    @Data
    static class JobEnqueueRequest {
        private final String type;
        private final String payload;
        private final String idempotencyKey; // null = auto-generate in DJP
        private final String callbackUrl;
    }

    @Data
    static class JobEnqueueResponse {
        private String id;
        private String status;
    }
}