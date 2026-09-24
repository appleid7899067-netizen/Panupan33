# Resilient Data Ingestion

## Purpose
Production-oriented data ingestion that survives unstable networks, changing pages, partial data, and parser failures.

## Goal-driven flow
Fetch → store raw response → parse → validate → upsert → verify.

## Rules
- Fetch and parse are separate stages.
- Preserve the raw response before parsing so parser fixes can replay old snapshots without fetching again.
- Deduplicate work and make writes idempotent.
- Retry transient failures with exponential backoff and jitter.
- Respect HTTP Retry-After for 429 responses.
- Treat 404 as a missing resource unless evidence says the resource is temporarily unavailable.
- Use a circuit breaker for repeated upstream failures.
- Quarantine invalid records instead of silently dropping them.
- Detect abnormal volume drops before accepting a batch.
- Verify the final data with real evidence before reporting success.

## Recovery memory
When fetch fails, retry only transient failures. When parsing fails, replay the saved raw response first. When validation fails, quarantine the record/batch and retain the reason. Never hide partial results.

## Web-change resilience
Use selector/parser versions, canary URLs, and snapshots when the source is important enough to justify them. A new parser should be compared against the old parser on known snapshots before becoming the default.

## Resource policy
Use the native Search/Web capability when available. Borrow a browser/runtime only for a concrete ingestion goal and only for the bounded execution window supplied by the Resource Broker.

## Verification
A successful fetch is not the same as successful ingestion. Verification should include, where applicable:
- response status and content presence
- parsed record count
- schema validation result
- duplicate/upsert result
- anomaly/volume check
- source reachability

## Never
- claim success from model prose alone
- discard raw data before validation
- hammer a domain after repeated failure
- retry permanent failures blindly
- accept a drastically reduced dataset without investigation
- bypass authentication, access controls, or robots/terms restrictions
