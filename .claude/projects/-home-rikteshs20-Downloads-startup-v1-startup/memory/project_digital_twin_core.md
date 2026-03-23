---
name: core-product-digital-twin
description: ExpertHub's core product is AI Digital Twin chat - experts create knowledge bases, subscribers chat with AI replicas. Current implementation is text-only streaming chat with RAG.
type: project
---

ExpertHub is an AI-powered expert knowledge platform. Core product: experts upload knowledge (posts, documents) into a knowledge base, and subscribers chat with their AI Digital Twin powered by RAG.

**Current tech stack:**
- Next.js 14 app router, Tailwind, Prisma, NextAuth v5 beta
- Text-only streaming chat via SSE (server-sent events)
- RAG-based responses with source citations
- Trial/paywall system for non-subscribers
- Session-based chat history
- Embeddable widget for expert websites

**Why this matters:** The user is actively seeking ways to make the digital twin experience feel more human-like and create a moat that makes the product viral. Competitor landscape includes Delphi AI ($16M Series A, Sequoia-backed) and Eternos.
