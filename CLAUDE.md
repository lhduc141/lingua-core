# LINGUAPANDA - AI-POWERED ENGLISH LEARNING PLATFORM

**Version**: 2025-12-19  
**Type**: Thesis MVP (1-person project)  
**Tech Stack**: NestJS Monorepo, PostgreSQL (Prisma), Redis, Gemini AI  
**Target**: A1-B2 CEFR English learners

---

## 🎯 PROJECT CONTEXT

You are working on **Linguapanda**, a personalized English learning platform that uses:
- **CEFR-based assessment** (A1-B2)
- **AI-powered adaptive learning plans** (rolling 2-week cycles)
- **4 skills**: Reading, Writing, Speaking (MVP: no Listening)
- **AI feedback** for subjective grading (Writing, Speaking)

**Timeline**: Now → Early May 2025  
**Scope**: MVP with 6 core features, 15 lessons, 10 practice sessions

---

## 🏗️ ARCHITECTURE (NON-NEGOTIABLE)

### Microservices Pattern:
```
apps/
├── api-gateway/     # Main backend (Auth, CRUD, business logic)
└── ai-service/      # AI microservice (Gemini integration)
```

### Data Ownership:
- **api-gateway** owns the database
- **ai-service** NEVER writes to DB directly
- **ai-service** returns JSON → gateway validates → gateway persists

### Communication:
- NestJS MessagePattern (TCP/Redis)
- Frontend ↔ Gateway: REST APIs (55 endpoints)

---

## 📂 KEY FILES TO UNDERSTAND

| File | Purpose |
|------|---------|
| `docs/Runbook.txt` | **Master guide** - read this first |
| `docs/BackEnd.txt` | Complete API specification (55 endpoints) |
| `docs/ContextSnapshot.txt` | Current progress & next steps |
| `schema.prisma` | Database schema (55+ tables, finalized) |
| `docs/claude/decisions/` | Architecture decision records |

---

## ✅ CURRENT STATUS (2025-12-19)

### Completed:
- ✅ Auth module (6 endpoints) - Production-ready
- ✅ API Specification (55 endpoints documented)
- ✅ Prisma schema finalized

### In Progress:
- 🔄 Onboarding & Placement module (next priority)

### Not Started:
- ❌ Learning Content
- ❌ Assessment & Grading
- ❌ Dictionary & SRS
- ❌ Learning Plan
- ❌ Dashboard
- ❌ Admin

---

## 🚀 DEVELOPMENT WORKFLOW

### 1. **Before Starting Any Task**:
```bash
# Always read the relevant section in Runbook.txt first
# Check ContextSnapshot.txt for current state
# Review API spec in BackEnd.txt for the module
```

### 2. **Implementation Order** (from Runbook):
```
Phase 1: Database Setup ✅ DONE
Phase 2: Backend Development (Month 1-4)
  Week 1-2:   Auth ✅ + Dictionary
  Week 3-4:   Onboarding + Placement ← YOU ARE HERE
  Week 5-6:   Lessons + Practice + Assessment
  Week 7-8:   SRS + Learning Plan
  Week 9-10:  Dashboard + Analytics
  Week 11-12: Admin + Polish
```

### 3. **Module Implementation Pattern**:
For each new module (e.g., Onboarding):
1. Read API spec from `BackEnd.txt`
2. Create DTOs (request/response validation)
3. Implement service layer (business logic)
4. Implement controller (HTTP handlers)
5. Add to module exports
6. Test with Postman/Thunder Client

---

## 🔑 ARCHITECTURE RULES (STRICT)

### Database:
- ✅ Use Prisma ORM only
- ✅ All tables have `createdAt`, `updatedAt`, `deletedAt` (soft delete)
- ✅ Use UUIDs for primary keys (`@default(dbgenerated("gen_random_uuid()"))`)
- ❌ NO raw SQL unless absolutely necessary

### API Design:
- ✅ RESTful endpoints (follow BackEnd.txt spec)
- ✅ Use class-validator DTOs
- ✅ Return structured errors (`{ statusCode, message, errors }`)
- ✅ JWT auth on all endpoints (except `/auth/*`)
- ❌ NO endpoints not in the spec (ask first)

### AI Integration:
- ✅ AI service only returns JSON
- ✅ Gateway validates AI output before persisting
- ✅ Store AI results in domain tables (NOT in `AiCache`)
- ❌ AI service NEVER writes to database

### Code Style:
- ✅ NestJS standard conventions
- ✅ Use dependency injection
- ✅ Separate concerns: Controller → Service → Repository (Prisma)
- ✅ Use argon2 for password hashing (NOT bcrypt)

---

## 📋 MVP SCOPE (FIXED - DO NOT EXPAND)

### 6 Core Features:
1. **Smart Onboarding & Placement**
    - Survey (12 questions)
    - Placement test (fixed questions + 1 essay)
    - AI CEFR evaluation → initial plan

2. **Adaptive Learning Plan**
    - Rolling 2-week cycles
    - Auto/manual trigger
    - Must complete current plan before next

3. **Skill-Based Learning**
    - 15 Lessons (theory 30% + practice 70%)
    - 10 Practice Sessions (standalone)
    - 3 skills: Reading, Writing, Speaking

4. **AI-Powered Feedback**
    - Subjective grading (Writing, Speaking)
    - Corrections + suggestions
    - Store in `AttemptEvaluation`

5. **Dictionary & SRS**
    - Dictionary lookup (DB → AI fallback)
    - Collocations (separate table)
    - SRS cards (SM-2 algorithm)

6. **Dashboard**
    - Progress overview
    - Skill breakdown
    - Study time tracking

### What's NOT in MVP:
- ❌ Listening skill
- ❌ Audio file storage (use Web Speech API only)
- ❌ Social features
- ❌ Exam system (beyond placement test)
- ❌ Marketplace

---

## 🤖 AI SERVICE CONTRACTS (FIXED)

The AI service ONLY handles these 4 contracts:

### 1. `ai.dictionary.generate`
**Input**: `{ word: string }`  
**Output**:
```json
{
  "ipa": "/rʌn/",
  "pos": "verb",
  "senses": [{
    "definition": "...",
    "viDefinition": "...",
    "examples": [{ "text": "...", "viText": "..." }],
    "synonyms": ["..."],
    "antonyms": ["..."],
    "collocations": [{ "phrase": "...", "meaning": "...", "viMeaning": "..." }]
  }]
}
```

### 2. `ai.placement.cefr`
**Input**: `{ surveyData, testResults, writingSample }`  
**Output**:
```json
{
  "overallLevel": "B1",
  "confidence": 0.85,
  "skillBreakdown": { "reading": "B1", "writing": "A2" },
  "rationale": "..."
}
```

### 3. `ai.plan.generate`
**Input**: `{ userId, cefrLevel, goals, recentPerformance?, currentCycle }`  
**Output**:
```json
{
  "planItems": [{
    "type": "lesson | practice_session",
    "refId": "uuid",
    "title": "...",
    "dueDate": "2025-01-20",
    "estimatedMinutes": 30
  }],
  "cycle": 2,
  "generatedAt": "2025-01-15"
}
```

### 4. `ai.grading.evaluate`
**Input**: `{ questionType, userText }`  
**Output**:
```json
{
  "overallScore": 6.5,
  "dimensions": [{
    "name": "grammar",
    "score": 6.0,
    "issues": [...],
    "comment": "..."
  }],
  "corrections": [{ "original": "...", "corrected": "...", "rule": "..." }],
  "suggestions": [...]
}
```

---

## 🛠️ COMMON COMMANDS

```bash
# Install dependencies
pnpm install

# Run migrations
npx prisma migrate dev
npx prisma generate

# Start services
pnpm run start:dev api-gateway
pnpm run start:dev ai-service

# Database studio
npx prisma studio

# Format code
pnpm run format

# Lint
pnpm run lint
```

---

## 📝 WHEN ASKING FOR HELP

Always provide:
1. **What module** are you working on?
2. **What specific endpoint/feature**?
3. **What have you tried**?
4. **What's the error** (if any)?
5. **Relevant code snippet**

Example:
```
"I'm implementing POST /onboarding/survey endpoint.
I created the DTO but getting validation error.
Here's my DTO code: [paste]
Error: [paste]"
```

---

## ⚠️ IMPORTANT REMINDERS

1. **Never skip reading Runbook.txt** - it contains all critical decisions
2. **Auth module is DONE** - don't modify unless bug found
3. **API spec is finalized** - don't add new endpoints without discussion
4. **Prisma schema is locked** - migrations only for corrections
5. **This is a 1-person thesis** - prioritize "good enough & working" over "perfect but complex"

---

## 🎓 FOR CLAUDE CODE

When you (Claude Code) work on this project:
- **Always check ContextSnapshot.txt first** to know current state
- **Follow the API spec in BackEnd.txt** exactly
- **Respect the architecture rules** (no shortcuts)
- **Ask before adding features** not in the spec
- **Keep code clean and documented**
- **Test each endpoint before moving to next**

Good luck building! 🚀