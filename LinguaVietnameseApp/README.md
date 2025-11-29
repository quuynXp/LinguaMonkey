🐵 **LinguaMonkey** – Learn Smarter, Speak Better

**LinguaMonkey** is a comprehensive language-learning app built with a Spring Boot monolith backend and a React Native Expo frontend. It integrates AI-powered speech and text analysis via a Python FastAPI service (using OpenAI & Whisper Transformer) and communicates asynchronously over gRPC. All sensitive configuration comes from environment variables, Redis handles caching, and authorization is enforced via JWT and a token-bucket rate limiter.

---

## 📌 Key Features

### Authentication & Authorization

- JWT-based Access & Refresh Tokens
- Token revocation (blacklist) table
- Roles & permissions managed through `roles`, `permissions`, `user_roles`, `role_permissions`
- Rate limiting with Uber’s Token Bucket algorithm

### Caching & Performance

- Redis for caching frequently accessed data (users, lessons, leaderboards…)
- All secrets and connection strings injected from environment variables

### AI & gRPC Integration

- FastAPI Python service exposes gRPC endpoints
- Whisper Transformer transcribes and analyzes audio
- OpenAI API for language feedback and content generation
- Async communication between Spring Boot and Python service

### Learning Platform

- Courses, series, categories, subcategories, lessons
- Question banks, progress tracking, wrong-answer logs
- Reviews, ratings, and user goals

### Real-Time Interaction

- WebSocket chat with message history & reactions
- Group video calls via embedded Jitsi Meet
- Study reminders, events, and shared goals
- Gamification: badges, EXP, streaks, leaderboard

### Frontend Stack

- **React Native Expo** (Android & iOS)
- **Zustand** for state management
- **useSWR** for data fetching & cache invalidation
- Direct media uploads to Cloudinary

---

## 🗄 Database Overview

The PostgreSQL schema contains roughly **50 tables**, including but not limited to:

- **User & Security**: `users`, `refreshtokens`, `invalidated_tokens`, `user_roles`, `roles`, `permissions`, `role_permissions`
- **Learning Content**: `courses`, `lessons`, `lesson_questions`, `lesson_progress`, `lesson_progress_wrong_items`, `lesson_series`, `lesson_categories`, `lesson_sub_categories`
- **Social & Communication**: `chat_messages`, `message_reactions`, `rooms`, `room_members`, `video_calls`, `video_call_participants`
- **Group Study**: `group_sessions`, `group_answers`
- **Gamification**: `badges`, `user_badges`, `leaderboards`, `leaderboard_entries`
- **Transactions & Events**: `transactions`, `events`, `user_events`
- **Supporting Tables**: `languages`, `notifications`, `course_enrollments`, `course_reviews`, `user_goals`, `user_reminders`, etc.

---

## ⚙️ Environment Setup

1. Create a `.env` file at the project root (not committed to VCS), defining at minimum:

   ```env
   SPRING_DATASOURCE_URL=...
   SPRING_DATASOURCE_fullname=...
   SPRING_DATASOURCE_PASSWORD=...
   REDIS_HOST=...
   REDIS_PORT=...
   JWT_SECRET=...
   PYTHON_SERVICE_HOST=...
   PYTHON_SERVICE_PORT=...
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   FIREBASE_API_KEY=...
   FIREBASE_PROJECT_ID=...
   ```

2. Spring Boot will load these via `spring.config.import=optional:env[.env]`.

---

## 🐳 Docker Deployment

All components can run in Docker containers and orchestrated with Docker Compose.

**docker-compose.yml** (example):

```yaml
version: "3.8"
services:
  backend:
    build: ./backend
    env_file:
      - .env
    ports:
      - "8080:8080"
    depends_on:
      - db
      - redis
      - ai-service

  ai-service:
    build: ./ai-service
    env_file:
      - .env
    ports:
      - "50051:50051"

  frontend:
    build: ./mobile-app
    env_file:
      - .env
    ports:
      - "19000:19000"
      - "19001:19001"
      - "19002:19002"

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: linguamonkey
      POSTGRES_USER: ${SPRING_DATASOURCE_fullname}
      POSTGRES_PASSWORD: ${SPRING_DATASOURCE_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  db-data:
```

### Build & Run

```bash
docker-compose up --build
```

- **backend**: Spring Boot app on port 8080
- **ai-service**: FastAPI gRPC service on port 50051
- **frontend**: Expo development server

---

## 🚀 Roadmap

- ✅ Core learning modules & progress tracking
- ✅ AI transcription & analysis
- ✅ Real-time chat & video call
- ⬜ AI-driven personalized recommendations
- ⬜ Admin dashboard & analytics

---

**License**: MIT © 2025 LinguaMonkey Team
