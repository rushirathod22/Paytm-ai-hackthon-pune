# OpsSaathi AI: Integration Status

| Integration Point | Target Provider | Operational Mode | PRD Requirement & Status | Notes |
|---|---|---|---|---|
| **LLM Reasoning & Function Calling** | Gemini API (`gemini-2.5-flash` / `gemini-1.5-pro`) | Hybrid (Live API with deterministic mock fallback) | FR-02, FR-03, FR-06: IMPLEMENTED | Uses Google GenAI SDK. If key missing/exhausted, mock zero-shot agent executes identical state machine. |
| **Payment Status / Lookup** | Paytm Payments API | Staging Adapter + Seeded Synthetic Fixtures | FR-04: IMPLEMENTED | Follows Paytm Server SDK & Checksum spec. If test MID unavailable, gracefully flags source as `SYNTHETIC_DEMO`. |
| **Settlement Ledger** | Paytm Settlement API | Synthetic Ledger (Labeled `SYNTHETIC_DEMO`) | FR-05: IMPLEMENTED | Paytm official documentation explicitly notes that Settlement API is production-only and not hosted on staging. Seeded ledger provides ₹15,000 gross / ₹9,000 settled / ₹6,000 pending. |
| **Webhooks** | Paytm Checksum & Callback | Checksum HMAC-SHA256 Validator & Deduplicator | FR-15, FR-16: IMPLEMENTED | Validates signatures, stores payload hashes, prevents replay attacks. |
| **Browser Speech-to-Text** | Web Speech API | Native In-Browser | FR-11: IMPLEMENTED | Fully functional in all modern Chromium/Edge browsers without external API keys. Text fallback always active. |
| **Voice Synthesis** | Web Speech API / Sarvam TTS | Native In-Browser + Sarvam Adapter | FR-11: IMPLEMENTED | Native speech synthesis with clear Indian English accent support. |
| **Relational Database** | PostgreSQL 16 | Docker Compose / Local Postgres (with SQLite automatic test fallback) | FR-01, FR-08, FR-10: IMPLEMENTED | Full UUID, JSON, and Decimal support. |
