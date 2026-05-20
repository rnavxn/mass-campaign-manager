package com.example.mass_campaign_manager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MassCampaignManagerApplication {

	public static void main(String[] args) {
		SpringApplication.run(MassCampaignManagerApplication.class, args);
	}

}
