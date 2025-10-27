# 🐵 MonkeyLingua – Learn Smarter, Speak Better

[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE) 
[![Platform](https://img.shields.io/badge/Platform-React%20Native%20%7C%20SpringBoot-blue)](https://reactnative.dev/)
[![Python Service](https://img.shields.io/badge/AI-Service-FastAPI-orange)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blueviolet)](https://www.docker.com/)

---

## 🎯 Overview

**MonkeyLingua** is a **comprehensive English-learning platform** integrating **AI-powered assistance** and **real-time interaction**. It combines:

- Structured learning with gamification  
- Intelligent feedback for pronunciation & grammar  
- Global peer-to-peer communication  

<p align="center">
  <img src="docs/assets/icon.png" alt="MonkeyLingua Overview" width="600"/>
</p>

> “Learning by connection, powered by AI.”

---

## 📚 Key Features

### 🏫 Learning Platform
- **Dynamic Roadmaps** – Adaptive learning paths based on personal goals (certifications, career, daily practice)  
- **Courses & Flashcards** – Vocabulary & grammar practice with **Anki-like spaced repetition**  
- **Video Learning**:  
  - Bilingual videos with **context-aware subtitles**  
  - Video call integration with AI-assisted real-time translation  

<p align="center">
  <img src="docs/assets/learning_flow.png" alt="Learning Flow" width="600"/>
</p>

### 🤖 AI-Powered Assistance
- **Real-Time Voice Feedback** – Pronunciation analysis & IPA scoring  
- **Storytelling & Conversation Generation** – AI generates quizzes, dialogues, and interactive exercises  
- **Smart Chat** –  
  - Real-time messaging with AI translation  
  - Vocabulary & grammar correction during chat  
  - Peer-to-peer interaction matched by language & learning goals  

<p align="center">
  <img src="docs/assets/ai_features.png" alt="AI Features" width="600"/>
</p>

### 💬 Social & Communication
- WebSocket-based **real-time chat** with reactions & message history  
- Group & 1:1 **video calls** via embedded **Jitsi Meet**  
- Gamification: badges, EXP, streaks, leaderboards  

<p align="center">
  <img src="docs/assets/social.png" alt="Social Features" width="600"/>
</p>

---

## ⚙️ Architecture & Technology Stack

<p align="center">
  <img src="docs/assets/architecture.png" alt="Architecture Diagram" width="600"/>
</p>

### Backend
- **Spring Boot Monolith** – Core services  
- **Python FastAPI** – AI & speech processing (Whisper + OpenAI)  
- **gRPC** – Async communication between services  
- **Redis** – Caching frequently accessed data  
- **JWT & Token Bucket** – Authentication & rate limiting  

### Frontend
- **React Native Expo** – Android & iOS  
- **Zustand** – State management  
- **useSWR** – Data fetching & caching  
- Direct media uploads to Cloudinary  

### Database
- **PostgreSQL** – ~50 tables  
  - Users, Roles, Permissions  
  - Courses, Lessons, Flashcards, Question Banks  
  - Chat Messages, Rooms, Video Calls  
  - Gamification: Leaderboards, Badges  
  - Tracking & Analytics  

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
```

- **backend**: Spring Boot (port 8080)  
- **ai-service**: FastAPI gRPC service (port 50051)  
- **frontend**: Expo dev server  
- **PostgreSQL & Redis**: persistent data & caching  

<p align="center">
  <img src="docs/assets/docker_compose_diagram.png" alt="Docker Compose Diagram" width="600"/>
</p>

---

## 🛠 Environment Variables

Create `.env` at project root:

```env
SPRING_DATASOURCE_URL=...
SPRING_DATASOURCE_USERNAME=...
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

---

## 🚀 Roadmap

| Status | Feature |
|--------|---------|
| ✅ | Core learning modules & progress tracking |
| ✅ | AI transcription & analysis |
| ✅ | Real-time chat & video call |
| ⬜ | AI-driven personalized recommendations |
| ⬜ | Admin dashboard & analytics |

<p align="center">
  <img src="docs/assets/roadmap.png" alt="Roadmap" width="600"/>
</p>

---

## 🌍 Vision & Global Impact

- **Global Learning Community** – Connect learners worldwide  
- **Real-Time AI Feedback** – Instant pronunciation & grammar corrections  
- **Adaptive Learning** – AI-powered personalized learning paths  
- **Future Expansion** – AR/VR classrooms, emotion-aware AI coaches, multi-language support  

<p align="center">
  <img src="docs/assets/future.png" alt="Future Vision" width="600"/>
</p>

---

## 🔒 Security & Performance

- **JWT & OAuth2** for secure authentication  
- **Token Bucket** algorithm for rate limiting  
- Encrypted sensitive data  
- Low-latency real-time interactions (<300ms for voice feedback)  

---

## 📸 Screenshots & Assets

Include screenshots for:  
- Learning dashboard  
- Chat & video call  
- Flashcards & quizzes  
- Leaderboards & progress charts  

<p align="center">
  <img src="docs/assets/screenshots.png" alt="App Screenshots" width="600"/>
</p>

---

## 📜 License

MIT © 2025 MonkeyLingua Team