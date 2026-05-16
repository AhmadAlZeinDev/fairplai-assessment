# Fairplai Core

Backend API for a sports team management platform. Built with NestJS, TypeORM, and PostgreSQL.

## Features

- JWT authentication (register / login / me)
- Club management with multi-sport support and soft delete
- AI analysis job triggering with async webhook result delivery
- Global JWT guard with `@Public()` decorator for open routes
- Unified response envelope: `{ success, data }` / `{ success, errorCode }`
- Request/response logging via AWS Kinesis (feature-flagged)
- Critical error alerts via Slack (feature-flagged)
- Health check at `/api/v1/health`
- Swagger UI at `/api/docs`

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your database credentials and secrets.

### 3. Start the development server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`.  
Swagger UI: `http://localhost:3000/api/docs`.

## Testing the Analysis API

The analysis flow is asynchronous your server triggers an AI job and the AI service calls back via webhook when done. For local testing a mock AI server is included that accepts the trigger request and automatically fires the signed webhook callback after 3 seconds.

### 1. Start the mock AI server

In a separate terminal:

```bash
npm run mock:ai
```

Make sure your `.env` has:

```
AI_MODULE_URL=http://localhost:4000
WEBHOOK_SECRET=your-webhook-secret
```

The mock server reads `WEBHOOK_SECRET` from the environment to sign its callback it must match the value in your `.env`:

```bash
WEBHOOK_SECRET=your-webhook-secret npm run mock:ai
```

### 2. Full test flow

**Step 1 Register or login to get a JWT:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "you@example.com", "password": "yourpassword" }
```

> **Note on `videoUrl`:** In production this field should be a pre-signed internal URL generated server-side after the client uploads the video to object storage (e.g. S3). The URL must never be client-supplied or publicly accessible the upload flow generates it and passes it directly to this endpoint. It is accepted as a plain URL here because video upload infrastructure is out of scope for this implementation.

**Step 2 Trigger an analysis job:**
```http
POST /api/v1/analysis/trigger
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "videoUrl": "https://storage.example.com/videos/test.mp4"
}
```

Response includes a `jobId`. The mock AI server logs the accepted job and schedules the webhook callback.

**Step 3 Wait ~3 seconds, then poll for the result:**
```http
GET /api/v1/analysis/<jobId>
Authorization: Bearer <token>
```

The job status will have moved from `pending` to `completed` with the result populated.

## Endpoints

### Auth (public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register a new user, returns JWT |
| POST | `/api/v1/auth/login` | Login, returns JWT |
| GET | `/api/v1/auth/me` | Get current user details (JWT required) |

### Clubs (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/clubs` | Create a club |
| GET | `/api/v1/clubs` | List clubs (paginated) |
| GET | `/api/v1/clubs/:id` | Get club by ID |
| PATCH | `/api/v1/clubs/:id` | Update club |
| DELETE | `/api/v1/clubs/:id` | Soft-delete club |

Query params for `GET /api/v1/clubs`: `page`, `perPage`, `sortBy`, `sortOrder`, `sport`.

### Analysis (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/analysis/trigger` | Trigger an AI analysis job |
| GET | `/api/v1/analysis/:jobId` | Get job status and result |
| POST | `/api/v1/analysis/webhook` | AI service callback (signed, public) |

### Health (public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Service and database health check |

## Response format

All responses follow a unified envelope:

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "errorCode": "CLUB_001" }
```

## Running tests

```bash
# Unit tests
npm run test

# Unit tests in watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

## Environment variables

See [`.env.example`](.env.example) for all required variables with descriptions.
