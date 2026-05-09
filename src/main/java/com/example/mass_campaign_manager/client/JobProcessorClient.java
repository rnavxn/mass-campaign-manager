package com.example.mass_campaign_manager.client;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Component
@RequiredArgsConstructor
public class JobProcessorClient {

    private final RestTemplate restTemplate;

    @Value("${job.processor.url}")
    private String jobProcessorUrl;

    /**
     * Submits a job to dist-job-processor.
     * type=EMAIL_SEND, payload=chunkId.
     * Idempotency is handled by dist-job-processor via MD5(type+payload).
     *
     * @return jobId returned by dist-job-processor
     */
    public String enqueueJob(String payload) {
        String url = UriComponentsBuilder
                .fromUriString(jobProcessorUrl + "/api/jobs/enqueue")
                .queryParam("type", "EMAIL_SEND")
                .queryParam("payload", payload)
                .toUriString();

        JobEnqueueResponse response = restTemplate.postForObject(url, null, JobEnqueueResponse.class);

        if (response == null || response.getId() == null) {
            throw new RuntimeException("dist-job-processor returned empty response for payload: " + payload);
        }

        log.info("Enqueued job {} for payload {}", response.getId(), payload);
        return response.getId();
    }

    // mirrors JobResponse from dist-job-processor — only fields we care about
    @Data
    public static class JobEnqueueResponse {
        private String id;
        private String status;
    }
}