## New Terms and Conditions Agreement Flow

### Summary

This PR introduces a mandatory Terms and Conditions acceptance flow for the Re7 ALMM application. Users must agree to the latest T&C before accessing the app.

### Changes

- **T&C Modal**: Updated `TncModal` component to block navigation until users accept the terms, with version tracking to prompt re-acceptance when terms are updated
- **T&C API Endpoint**: New `/api/tnc/accept` endpoint to register user agreement with wallet address validation and referral support
- **T&C Page**: Added dedicated `/terms-and-conditions` page using MDX for easy content management
- **Database Migration**: New schema to store user T&C acceptance status and document version
- **MDX Support**: Added MDX configuration for rendering markdown-based legal content

### Key Features

- Version-aware T&C tracking (`LATEST_TNC_DOC_VERSION`) - users are prompted again when terms are updated
- Wallet signature verification for acceptance
- Referral code integration during T&C acceptance flow
- Dedicated T&C page accessible at `/terms-and-conditions`

### Files Changed

| Area     | Files                                                          |
| -------- | -------------------------------------------------------------- |
| Frontend | `TncModal.tsx`, `page.mdx`, `layout.tsx`, `mdx-components.tsx` |
| Backend  | `/api/tnc/accept/route.ts`                                     |
| Config   | `next.config.mjs`, `tsconfig.json`, `constants.ts`             |
| Database | `migration.sql`                                                |
