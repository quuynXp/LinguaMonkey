# LinguaMonkey — Learn Smarter, Speak Better

> Production-ready README for developers, reviewers and deployment engineers.

## Table of contents
1. [Project Overview](#project-overview)  
2. [Key Features](#key-features)  
3. [Architecture & Components](#architecture--components)  
4. [Data Model (DB) — summary](#data-model-db---summary)  
5. [Requirements & Environment](#requirements--environment)  
6. [Quickstart (Docker)](#quickstart-docker)  
7. [Local dev & run (overview)](#local-dev--run-overview)  
8. [API & Integration notes](#api--integration-notes)  
9. [Testing & CI/CD](#testing--cicd)  
10. [Roadmap](#roadmap)  
11. [Contributing & Code style](#contributing--code-style)  
12. [License](#license)

---

## Project overview
**LinguaMonkey** is a mobile-first language learning platform combining a Spring Boot backend, a React Native (Expo) frontend, and an AI microservice (Python/FastAPI) for speech/text analysis. The app supports personalized learning paths, real-time chat and group study, AI-driven feedback (speech-to-text, suggestions), and gamification (badges, EXP, streaks).

This README is intended for engineers and maintainers: it describes architecture, required environment variables, deployment via Docker Compose, important data model highlights and operational notes.

---

## Key features
- Authentication & Authorization  
  - JWT access/refresh tokens, token revocation table, role/permission model.
- AI & Speech Processing  
  - FastAPI-based AI service (Whisper / Transformer models) exposed over gRPC — used for speech-to-text, pronunciation scoring and content generation.
- Learning platform  
  - Courses, series, lessons, flashcards, quizzes, progress tracking, wrong-answer logs, course reviews.
- Real-time & social  
  - WebSocket/STOMP chat with room members, message reactions; group video calls (Jitsi Meet); group study sessions.
- Gamification & retention  
  - Badges, leaderboards, daily challenges, streaks and rewards.
- Media handling & performance  
  - Client uploads media directly to Cloudinary; Redis for caching and counters; environment-driven secrets.

---

## Architecture & components
High-level components:
- **mobile-app** — React Native (Expo) client (Android + iOS). Uses Zustand for state, React Query for server sync.  
- **backend** — Spring Boot monolith (REST API, WebSocket/STOMP, security, scheduling, integration layers). Uses JPA/Hibernate for DB access.  
- **ai-service** — Python FastAPI exposing gRPC endpoints and handling Whisper/Transformer model inference (speech-to-text, analysis). Communicates asynchronously with backend via gRPC.  
- **db** — PostgreSQL for relational data.  
- **cache/msg** — Redis (cache, pub/sub, counters).  
- **media** — Cloudinary for media storage & CDN.  
- **video** — Jitsi Meet embedded for video calls.

---

## Data model (DB) — summary
The full schema defines ~50 tables. Key tables / domains include:

- **Auth & security**: `users`, `refresh_tokens`, `invalidated_tokens`, `roles`, `permissions`, `user_roles`, `role_permissions`.  
- **Learning content**: `courses`, `lessons`, `lesson_series`, `lesson_categories`, `lesson_sub_categories`, `lesson_questions`, `lesson_progress`, `lesson_progress_wrong_items`.  
- **Social / Realtime**: `chat_messages`, `message_reactions`, `rooms`, `room_members`, `video_calls`, `video_call_participants`.  
- **Gamification & events**: `badges`, `user_badges`, `leaderboards`, `leaderboard_entries`, `daily_challenges`, `events`, `user_events`.  

> The schema file (`schema.sql`) was generated from pgAdmin and contains table definitions, constraints and comments — use it as canonical DB reference for migrations and seed scripts.

---

## Requirements & environment variables
Minimum runtime:
- Docker & Docker Compose (for quick local deployment)
- Java 17+ (for Spring Boot)
- Node 18+ / Yarn or npm (for Expo)
- Python 3.10+ for AI service (if run locally)

Important environment variables (example — **do not commit** `.env` to VCS):

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/linguamonkey
SPRING_DATASOURCE_USERNAME=...
SPRING_DATASOURCE_PASSWORD=...
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=...
PYTHON_SERVICE_HOST=ai-service
PYTHON_SERVICE_PORT=50051
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=...
```

Spring Boot loads these via `spring.config.import=optional:env[.env]` in production-like setups. (Follow the project config for more variables — keys for OAuth, SMTP, RSA keys, etc.)

---

## Quickstart (Docker Compose)
Example `docker-compose.yml` (trimmed):

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    env_file: .env
    ports: ["8080:8080"]
    depends_on: [db, redis, ai-service]

  ai-service:
    build: ./ai-service
    env_file: .env
    ports: ["50051:50051"]

  frontend:
    build: ./mobile-app
    env_file: .env
    ports: ["19000:19000"]

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: linguamonkey
      POSTGRES_USER: ${SPRING_DATASOURCE_USERNAME}
      POSTGRES_PASSWORD: ${SPRING_DATASOURCE_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data

  redis:
    image: redis:7

volumes:
  db-data:
```

Start:
```bash
docker-compose up --build
```

This will bring up backend on `:8080`, ai-service gRPC on `:50051`, and Expo dev server for the mobile app on usual Expo ports.

---

## Local dev & run (overview)
- **Backend**: run with `./mvnw spring-boot:run` (or via IDE). Provide `.env` or env vars. Use Swagger UI (auto-generated) to inspect endpoints.  
- **AI service**: run the FastAPI app (gRPC server). Models may require GPU or CPU fallback — configure via env and model checkpoints.  
- **Frontend**: `expo start` (or `yarn start`) — configure `axios` base URL to backend and Cloudinary keys.

---

## API & integration notes
- REST endpoints follow `/api/v1/*` convention; controllers → services → repositories pattern. Swagger UI available for testing and to paste JWT for authenticated calls.  
- **gRPC contract**: proto files define the contract between Spring backend and Python AI service (speech/transcription/analysis). Keep proto definitions in sync; prefer using generated clients for typed calls.  
- **Realtime**: STOMP over WebSocket is used for chat; rooms and membership stored in DB tables (`rooms`, `room_members`).  

---

## Testing & CI/CD
- Existing test tools: JUnit + Mockito (backend), Jest (frontend). Load testing recommended via `k6` or `JMeter`.  
- CI/CD suggestion (roadmap): GitHub Actions for build/test, Docker image builds, staging deploy; IaC with Terraform/Helm for clusters.

---

## Roadmap (priority highlights)
- AI: improve model latency & pronunciation scoring (GPU inference + queueing).  
- Offline support + sync conflict resolution (high priority).  
- AI-driven personalized recommendations & admin dashboard.

---

## Contributing & code style
- Fork → feature branch → PR with clear description & tests.  
- Backend: follow existing package structure and Spring conventions; write unit tests for service + controller.  
- Frontend: React Native + TypeScript; use Zustand for global state, React Query for server state.  

---

## Useful references
- [Canonical DB schema (schema.sql)](https://drive.google.com/file/d/1XhzeVPcVjhPkpStgQQmjaM3mHSvHAHZf/view?usp=sharing)  
- [Project report & system design (docx)](https://docs.google.com/document/d/1xWuEr5XKgFyimcMBCXzdA5gh73D1gXWg/edit?usp=sharing&ouid=108222992508585295715&rtpof=true&sd=true)

---

## License
MIT © 2025 LinguaMonkey Team
