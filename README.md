# ReachInbox — Email Scheduling Dashboard

A full-stack email scheduling application built with React, TypeScript, Express, PostgreSQL, Redis, BullMQ, Elasticsearch, and Ethereal SMTP.

The application allows users to schedule emails for future delivery, manage scheduled and sent emails, upload recipient lists through CSV/text input, and search indexed email records.

## Features

* **Email Scheduling:** Schedule emails for a future date and time.
* **Multiple Senders:** Manage sender accounts and associate emails with a sender.
* **Background Processing:** BullMQ and Redis process scheduled email jobs without cron jobs.
* **Persistent Storage:** PostgreSQL stores email records, sender information, scheduling details, and delivery status.
* **Email Delivery:** Ethereal SMTP is used for testing email delivery.
* **Search:** Elasticsearch indexes sent emails for searching by recipient, subject, and body.
* **Rate Limiting:** Redis-based hourly slot reservations help limit email processing per sender.
* **Configurable Worker Concurrency:** Worker concurrency can be configured using an environment variable.
* **Minimum Processing Delay:** Configure a delay before processing an individual email job.
* **Dashboard:** View email statistics and scheduled/sent email records.
* **CSV/Text Input:** Compose emails using recipient input, including supported CSV/text workflows.
* **Error Handling:** Backend API endpoints return appropriate error responses for common failures.

## Technology Stack

| Layer         | Technology                   |
| ------------- | ---------------------------- |
| Frontend      | React, TypeScript, Vite, CSS |
| Backend       | Node.js, Express, TypeScript |
| Database      | PostgreSQL                   |
| ORM           | Prisma                       |
| Queue         | BullMQ                       |
| Queue Storage | Redis                        |
| Search        | Elasticsearch                |
| Email         | Nodemailer, Ethereal SMTP    |

## Project Structure

```text
reachinbox-assignment/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── queues/
│   │   ├── routes/
│   │   ├── services/
│   │   └── workers/
│   ├── app.ts
│   ├── docker-compose.yml
│   └── package.json
├── frontend/
│   ├── src/
│   └── package.json
├── .gitignore
├── package.json
└── README.md
```

## Prerequisites

Install the following before running the project:

* Node.js and npm
* Docker Desktop
* Git

Docker Desktop should be running before starting the infrastructure services.

## Setup and Installation

### 1. Clone the repository

```bash
git clone https://github.com/nishu-sharma-001/reachinbox-assignment.git
cd reachinbox-assignment
```

### 2. Start infrastructure services

From the project root, run:

```bash
docker compose -f backend/docker-compose.yml up -d
```

The local services use these default ports:

| Service       | Port |
| ------------- | ---: |
| PostgreSQL    | 5432 |
| Redis         | 6379 |
| Elasticsearch | 9200 |

Ensure the ports are available and the containers start successfully.

### 3. Configure environment variables

Create `backend/.env` and configure the values for your local environment.

Example configuration:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME"
REDIS_HOST=localhost
REDIS_PORT=6379

WORKER_CONCURRENCY=5
MIN_SEND_DELAY_MS=2000
DEFAULT_HOURLY_LIMIT=100

ELASTICSEARCH_URL=http://localhost:9200

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=YOUR_ETHEREAL_USERNAME
SMTP_PASS=YOUR_ETHEREAL_PASSWORD
```

Use the actual database credentials, database name, and SMTP environment variable names expected by the backend configuration. Generate Ethereal test credentials from the Ethereal Email website.

**Security:** Never commit `.env` files, passwords, SMTP credentials, API keys, or other secrets to GitHub. The repository's `.gitignore` excludes environment files.

### 4. Install backend dependencies

```bash
cd backend
npm install
```

Apply the database migrations:

```bash
npx prisma migrate deploy
```

If setting up a development database for the first time and no migrations have been created, create an appropriate development migration before running the application.

### 5. Run the backend API

From the `backend` directory:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:5000
```

### 6. Run the email worker

Open a second terminal:

```bash
cd backend
npm run worker
```

The worker processes queued email jobs. Configure concurrency using `WORKER_CONCURRENCY` in the backend environment.

### 7. Run the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in the terminal, commonly:

```text
http://localhost:5173
```

## API Overview

The backend exposes endpoints for email scheduling, retrieving email records, statistics, and search.

| Method | Endpoint                       | Purpose                       |
| ------ | ------------------------------ | ----------------------------- |
| POST   | `/api/emails`                  | Schedule an email             |
| GET    | `/api/emails`                  | Retrieve email records        |
| GET    | `/api/emails?status=SENT`      | Retrieve sent emails          |
| GET    | `/api/emails?status=SCHEDULED` | Retrieve scheduled emails     |
| GET    | `/api/emails/search?q=keyword` | Search indexed email records  |
| GET    | `/api/emails/stats`            | Retrieve dashboard statistics |

The exact routes and request payloads are defined in the backend route and controller files.

## Queue Processing and Persistence

1. The API validates the scheduling request.
2. The email record is saved to PostgreSQL.
3. A delayed job is added to BullMQ.
4. Redis stores queue state and supports rate-limit slot reservations.
5. The worker processes the job when it becomes eligible.
6. The email is sent through the configured SMTP transport.
7. The email record is updated with its delivery status and timestamp.
8. Sent email records are indexed in Elasticsearch.

PostgreSQL persists application records, while Redis and BullMQ maintain queue state. Keeping these services running is necessary for the complete application workflow.

## Rate Limiting and Concurrency

* Worker concurrency is configurable through `WORKER_CONCURRENCY`.
* The hourly limit can be configured for scheduled email jobs.
* Redis atomic operations reserve hourly slots across worker processes.
* Jobs that reach the hourly limit are delayed instead of intentionally discarded.
* A per-job delay can be configured before sending.

Note that a per-job delay is not the same as a guaranteed global interval between all email sends when multiple workers process jobs concurrently.

## Email Testing

Ethereal SMTP is intended for testing and development. It does not deliver test emails to real recipients in the same way as a production email service.

Use the Ethereal account credentials configured in the backend environment and inspect the generated preview for test messages.

## Known Limitations and Future Improvements

* Implement and verify Google OAuth login, user sessions, and logout.
* Implement Slack OAuth connection, securely persist per-user Slack credentials, and send actual rate-limit notifications.
* Add and verify a live BullMQ queue dashboard.
* Add Elasticsearch indexing when an email is scheduled, in addition to indexing after sending.
* Add integration tests for restart recovery, duplicate prevention, concurrency, and hourly rate limiting.
* Improve delivery guarantees around the failure window between SMTP acceptance and database updates. SMTP delivery cannot generally guarantee exactly-once behavior without suitable provider support.
* Add production-grade authentication, authorization, and secret management before deployment.

## Assumptions and Trade-offs

* The project currently targets local development and demonstration rather than production deployment.
* Ethereal SMTP is used to test delivery without relying on a production email provider.
* PostgreSQL is the source of truth for email records; Elasticsearch is used for search.
* Redis supports queue processing and rate-limit coordination.
* External OAuth and Slack integrations must be configured and implemented before those capabilities can be considered complete.

## License

This project was developed as a full-stack email scheduling assignment. No open-source license has been specified.
