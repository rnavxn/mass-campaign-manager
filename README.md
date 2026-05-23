# Mass Campaign Manager

![Java](https://img.shields.io/badge/Java-21-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4-6DB33F?style=flat&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)

A production-grade distributed messaging engine for processing large-scale email and SMS campaigns. The system partitions massive recipient payloads, dispatches them asynchronously to decoupled worker nodes, and tracks execution telemetry in real-time through a React dashboard.

---

## Table of Contents
- [System Interface](#system-interface)
- [Architecture](#architecture)
- [Distributed Systems Design](#distributed-systems-design)
- [Features & Stack](#features--stack)
- [Local Setup](#local-setup)
- [API Reference](#api-reference)
- [Load Testing](#load-testing)

---

## System Interface

<details open>
<summary><b>Dashboard & Live Telemetry</b></summary>
<br>
<img width="1920" height="1200" alt="Screenshot_2026-05-22_22 32 43" src="https://github.com/user-attachments/assets/3aaad46e-94a0-4c94-a2ea-31aafeedc603" />
<br>
<img width="1920" height="1200" alt="Screenshot_2026-05-22_22 32 49" src="https://github.com/user-attachments/assets/602208d5-258e-4aaf-aa5b-1ddf2fbcf8e6" />
</details>

---

## Architecture

```mermaid
graph TD
    UI["React UI · Nginx :3001"]
    MCM["Mass Campaign Manager · Spring Boot :8081"]
    DB[("PostgreSQL :5432")]
    DJP["dist-job-processor · Spring Boot :8080"]

    UI -->|"REST /api/*"| MCM
    MCM -->|JPA| DB
    MCM -->|"POST /jobs · Async Enqueue"| DJP
    DJP -->|"POST /process-chunk · Webhook"| MCM
    MCM -->|"Aggregate Counts · Pessimistic Lock"| DB
````

## Distributed Systems Design

The core challenge of this system is maintaining absolute data correctness under heavy concurrency without blocking the user interface.

- **Pessimistic Write Locking:** `@Lock(LockModeType.PESSIMISTIC_WRITE)` on the campaign row serializes database callbacks. This prevents race conditions when 200+ worker webhooks hit the aggregation endpoint simultaneously, guaranteeing accurate cumulative totals.
- **Non-Blocking Async Launch:** Eliminates HTTP thread blocking by moving recipient partitioning to a `CompletableFuture` background thread. The API returns `202 Accepted` in milliseconds.
- **Transaction Isolation:** Removing the method-level `@Transactional` wrapper from the launch loop ensures chunk rows are durably committed to PostgreSQL _before_ the job enqueue request fires, eliminating "Record Not Found" webhook races.
- **Fail-Fast Circuit Breaker:** The enqueuing loop safely aborts after 3 network failures to dead workers, preventing indefinite thread hanging and memory exhaustion.
- **Idempotent Recovery:** Re-running a `FAILED` campaign queries original UUIDs to re-enqueue _only_ incomplete chunks, ensuring safe retries without duplicating data.


## Features & Stack

### Core Features

- **Configurable Chunking:** Set custom chunk sizes and dispatch rate limits (msgs/sec) per campaign.
- **Live Progress Telemetry:** UI polls dynamic execution states every 3 seconds while a campaign is `RUNNING`.
- **Automated Scheduler:** Native `@Scheduled` background daemon autonomously polls and launches future-dated campaigns.
- **Smart Re-run:** Idempotent failure recovery pipeline for dead workers or network drops.

### Technology Stack

- **Backend:** Java 21, Spring Boot, Spring Data JPA
- **Database:** PostgreSQL 16
- **Frontend:** React 19, React Router v7, Tailwind CSS v4
- **Infrastructure:** Docker, Docker Compose, Nginx (Serving), Vite (Local Dev)

## Local Setup

### Prerequisites
- Docker and Docker Compose installed.
- Ensure the decoupled worker microservice ([dist-job-processor](https://github.com/rnavxn/dist-job-processor)) is running locally at port `:8080`.

### Installation
```bash
# Clone the repository
git clone [https://github.com/rnavxn/mass-campaign-manager](https://github.com/rnavxn/mass-campaign-manager)
cd mass-campaign-manager

# Configure environment variables
cp .env.example .env

# Boot the infrastructure
docker compose up --build
```

**Service Routing:**
- **React UI:** `http://localhost:3001`
- **MCM API:** `http://localhost:8081`

_(Note: Ensure `POSTGRES_DB`, `JOB_PROCESSOR_URL`, and `APP_SELF_BASE_URL` are correctly mapped in your `.env` file)._

## API Reference
| **Method**  | **Endpoint**                         | **Description**                    |
|-------------|--------------------------------------|------------------------------------|
| `GET`       | `/api/campaigns`                     | List all campaigns                 |
| `POST`      | `/api/campaigns`                     | Create a draft campaign            |
| `GET`       | `/api/campaigns/:id`                 | Get campaign details               |
| `DELETE`    | `/api/campaigns/:id`                 | Delete a `DRAFT` campaign          |
| `POST`      | `/api/campaigns/:id/recipients`      | Upload CSV recipient payload       |
| `POST`      | `/api/campaigns/:id/launch`          | Async trigger or Re-run a campaign |
| `GET`       | `/api/campaigns/:id/chunks`          | Fetch live chunk telemetry         |
| `POST`      | `/api/internal/worker/process-chunk` | Webhook receiver from worker       |

## Load Testing
A zero-dependency Python script is included in the root directory to generate massive mock datasets for infrastructure scaling tests.

```bash
# Generates a 1,000,000 row CSV in ~1.5 seconds
python3 generate_mock_data.py --rows 1000000 --output load_test.csv
```

_(A lightweight `sample_10k.csv` is already included for quick functional testing)._

## Related Repositories

- [rnavxn/dist-job-processor](https://github.com/rnavxn/dist-job-processor) — The generic distributed worker node. Stateless and campaign-agnostic. Receives job payloads and fires completion webhooks.
