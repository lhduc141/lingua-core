# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Project Overview

Project name: LinguaPanda - LinguaPandaCore  
Type: AI-powered English learning platform (Graduation Thesis – 2026)

Core goal:
- Evaluate learner CEFR level accurately
- Generate adaptive learning plans
- Support continuous learning loop with measurable progress

All decisions MUST align with:
- runbook.md
- architecture.md
- ai.md
- data.md
- flows.md

If there is any conflict: Human decision > Claude suggestion > Runbook 

## 2. ARCHITECTURE (CURRENT – MUST FOLLOW)

This is a monorepo with microservices architecture:: lingua-panda-core/
High-level flow:
    Frontend (Next.js – later)
    → API Gateway (NestJS)
    → AI Service (NestJS microservice)
    → External LLM (Gemini Pro)
    → PostgresSQL / Redis

### Key rules (NON-NEGOTIABLE)

- Microservices architecture is mandatory
- API Gateway NEVER calls LLM directly
- AI Service NEVER writes to database
- All AI calls go through MessagePattern
- Backend validates and decides whether to persist AI output

```
Next.js (Future) → API Gateway (NestJS) → AI Service (Gemini Pro) → PostgreSQL
```

### Core Components

1. **API Gateway** (`apps/api-gateway`): NestJS backend handling authentication, assessments, CMS, SRS, and user management
2. **AI Service** (`apps/ai-service`): Gemini API keys service for AI evaluations (CEFR scoring, writing feedback, plan generation)
3. **Shared Libraries** (`libs/`): Common utilities for AI client, JWT handling, BullMQ queues, and shared code


## 3. SERVICES

### API Gateway (`apps/api-gateway`)
- NestJS 10
- Owns business logic & database writes
- Handles:
    - Auth
    - Onboarding
    - Exams & Assessments
    - Reports
    - Learning Plans
    - SRS & Dictionary

### AI Service (`apps/ai-service`)
- NestJS microservice (NOT FastAPI)
- Responsibilities:
    - Build prompts
    - Call Gemini Pro
    - Parse structured JSON
    - Apply heuristic fallback if needed
- Communicates via:
    - @MessagePattern:
        - ai.placement.cefr
        - ai.plan.generate
        - ai.writing.grade
        - (future) ai.dictionary.lookup

AI Service:
- ❌ does NOT own data
- ❌ does NOT decide flow
- ❌ does NOT persist anything

## 4. CORE LEARNING FLOWS (VERY IMPORTANT)

### CORE FLOW 1 (CURRENT PRIORITY)
Onboarding → Placement → CEFR → Learning Plan

Status:
- CEFR placement: DONE (ai.placement.cefr)
- Remaining to implement:
    - ai.plan.generate
    - ai.writing.grade
    - Full onboarding + placement APIs

Claude MUST focus on Core Flow 1 first.

### CORE FLOW 2
Daily practice + AI feedback

### CORE FLOW 3
Smart Dictionary + SRS

Claude MUST NOT jump ahead unless explicitly asked.

================================================================

## 5. CURRENT IMPLEMENTATION PRIORITY (STRICT)

You MUST help implement these APIs in order:

1. Onboarding Survey
- POST /onboarding/survey
- GET  /onboarding/survey/me

2. Placement Test
- GET  /exams/placement
- POST /exams/attempt/submit

3. AI CEFR Evaluation
- POST /ai/placement/cefr

4. Learning Plan Generation
- POST /ai/plan/generate

Anything outside this list is secondary.

================================================================

## 6. AI CONTRACT RULES (FROM ai.md)

For every AI capability:
- Input & output MUST be structured JSON
- Output MUST include confidence / rationale
- Backend ALWAYS validates AI output
- Backend can override or reject AI result

Claude MUST NOT:
- Add new AI capabilities without updating ai.md
- Change AI contract silently

## 7. DATABASE & DATA OWNERSHIP

- PostgreSQL 16
- Prisma ORM
- ~45 tables (see data.md)

Rules:
- Each service owns its domain data
- AI Service never touches DB
- AI outputs must be logged for audit

## 8. HOW CLAUDE SHOULD WORK

Claude is acting as:
- Senior Backend Engineer
- System Architect assistant

Claude SHOULD:
- Follow runbook strictly
- Propose clean API contracts
- Respect module boundaries
- Prefer clarity over cleverness

Claude SHOULD NOT:
- Invent features not in runbook
- Violate microservice rules
- Make product decisions

## Development Commands

### Setup
```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration (DATABASE_URL, JWT secrets, AI API keys, etc.)
```

### Database
```bash
# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# View database in Prisma Studio
npx prisma studio
```

### Development
```bash
# Start both API gateway and AI service in watch mode
pnpm start-all:dev

# Start only API gateway
pnpm start:dev

# Start both services in production mode
pnpm start-all
```

### Production
```bash
# Build the application
pnpm build

# Start production build
pnpm start:prod
```

### Code Quality
```bash
# Run ESLint with auto-fix
pnpm lint

# Format code with Prettier
pnpm format

# Run all tests
pnpm test
```

### Docker
```bash
# Build Docker image
docker build -t linguapanda-core .

# Run container (ensure DATABASE_URL and other env vars are set)
docker run -p 3000:3000 linguapanda-core
```

## Key Technologies

### Backend
- NestJS 10, TypeScript
- PostgresSQL 16 + Prisma
- Redis + BullMQ
- JWT (access + refresh)
- Argon2id for password hashing

### AI Service
- Gemini Pro (called from apps/ai-service via API key in env)
- AI service is NestJS microservice (MessagePattern-based)

## Module Structure

The API Gateway is organized into modules in `apps/api-gateway/src/modules/`:
- `auth` - Authentication (local + Google OAuth)
- `assessments` - AI-powered placement testing
- `cms` - Content management system
- `dictionary` - Smart dictionary with AI fallback
- `exams` - Examination management
- `notifications` - User notifications
- `onboarding` - User onboarding flow
- `plans` - Learning plan generation
- `reports` - Progress reports
- `srs` - Spaced Repetition System
- `users` - User management

## Environment Variables

Required environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `AI_SERVICE_HOST` - AI service endpoint
- `REDIS_HOST`, `REDIS_PORT` - Redis configuration
- `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` - JWT configuration
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `LLM_API_KEY` - OpenAI API key
- `LLM_MODEL` - AI model to use

## API Documentation

Swagger UI is available at:
```
http://localhost:3000/api/docs
```

## Core Learning Flows

1. **Placement Flow**: User signup → Profile → Placement test → AI CEFR evaluation → Personalized learning plan
2. **Daily Learning**: Lessons (Reading/Grammar/Vocab) → Writing practice → AI feedback → Progress tracking
3. **SRS Flow**: Dictionary lookup → Add to flashcards → Daily review → Vocabulary progress

## Important Notes

- The project uses pnpm workspaces for monorepo management
- Database schema has 45 tables and is managed through Prisma
- Both services can be run concurrently using the custom `concurrently.js` script
- The frontend (Next.js) is planned but not yet implemented
- All API endpoints require JWT authentication (except auth endpoints)