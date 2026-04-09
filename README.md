# Labor Relations Portal

Labor Relations Portal is a Next.js application for building a searchable agreement database and AI-assisted workspace around collective bargaining agreements and related labor documents.

The project is currently centered on a practical agreement-management workflow:
- upload and organize agreements
- capture and edit agreement metadata
- search agreement metadata and extracted text
- preview agreements in-app
- manage authenticated user access by role and chapter
- support chapter-scoped and nationally shared agreement access

## Source of truth

This repository is the source of truth for the project.

When making changes:
- use the current repo state, not memory
- verify actual file paths and current code before editing
- prefer small, grounded changes over speculative rewrites
- do not assume branch state from prior chats
- keep behavior changes narrow and testable

## Current status

The app is in active pre-alpha development.

The current product direction is:
- the **Agreement Database** is the primary working surface
- authenticated access and chapter-based permissions are now part of the core product
- chat/RAG remains important, but is secondary to the agreement database workflow
- system administration and chapter administration are being expanded to support real user onboarding and chapter-scoped access before broader alpha use
- agreement-list and agreement-search scalability are now an active workstream on the `search-scale` branch
- the next major structural focus is the **canonical agreement model**, so logical agreements are no longer inferred from multiple raw document rows

## Working features

### Agreement database

The main working surface for uploaded agreements.

Current capabilities include:
- agreement list with filtering by chapter, local union, agreement type, state, national database inclusion, and expired agreement visibility
- agreement list now loaded through a PostgreSQL-backed server route instead of broad KB/file fan-out loading
- server-side agreement deduplication for logical agreement display
- server-side pagination for the main agreement list
- clickable column-header sorting on the agreement list
- agreement name click-through to open in-app preview
- agreement metadata editing
- extracted-text content search
- content search now honors the currently filtered agreement universe
- content search now uses the same scope and dedupe model as the main agreement list
- content-search pagination
- side-panel agreement preview
- in-document PDF viewing with search and highlight
- text and PDF inline preview support
- shared/national agreement visibility for chapter admins
- chapter-admin read-only access to out-of-scope nationally shared agreements with direct download from the document viewer
- direct download button in the agreement database list for read-only users when the agreement is visible to them
- agreement deletion moved into the Edit Agreement modal rather than the list row actions
- “Clear All” behavior that resets filters, search, sort, and pagination state

### Upload and storage

Uploads currently:
- create agreement-related document records
- store original uploaded files locally
- extract PDF text for agreement content search
- send files into OpenAI/vector-store workflows used by retrieval/chat
- support chapter selection during upload based on user permissions
  - system admins can choose from the full chapter list
  - chapter admins are limited to assigned chapters
- optionally create a nationally shared copy in the `cbas_shared` system knowledge base when the agreement is shared nationally

### Authentication and access control

Authentication and authorization are now active parts of the application.

Current capabilities include:
- authenticated sign-in flow
- account status tracking (`INVITED`, `ACTIVE`, `DENIED`, `DISABLED`)
- global role support (`SYSTEM_ADMIN`, `STANDARD`)
- chapter membership support with per-chapter roles
- chapter admin restrictions for agreement upload/edit/delete
- contractor/read-only users can download visible agreements but cannot upload or remove them
- public chapter list endpoint used by access-request and admin workflows
- proxy-based auth gating for protected routes
- public activation flow for invited users
- public forgot-password flow
- public reset-password flow
- password reset token generation, validation, expiry handling, and single-use behavior

### Access requests and onboarding

Access request and onboarding workflows now include:
- public request-access flow
- support for single-chapter Member Contractor requests
- support for multi-chapter Chapter Staff requests
- admin review of pending requests
- request deletion for duplicate or mistaken submissions
- approval provisioning that creates or updates users and chapter memberships
- invite-token generation on approval
- activation link generation on approval
- create-password / activate-account flow that sets the user password and transitions the account to `ACTIVE`

### System administration

System administration now includes:
- access request review
- access request approval, denial, pending reset, and deletion
- active user management
- updating account status
- assigning and removing chapter memberships
- setting chapter membership role (`USER` or `CHAPTER_ADMIN`)
- updating global role (`STANDARD` or `SYSTEM_ADMIN`)
- approval flow that provisions users without requiring admins to manually set passwords

### Chapter administration

Chapter administration is now present as a distinct working surface.

Current capabilities include:
- dedicated chapter admin entry page
- scoped access-request review for requests that fall entirely within the chapter admin’s assigned chapter scope
- chapter-admin approval/denial/delete behavior enforced through scoped API access
- chapter-admin approval flow that also generates invite activation links for in-scope requests

### Chat / RAG

The app includes chat workflows that retrieve against agreement-related knowledge bases.

Current intent:
- chat works alongside the agreement database
- the agreement database remains the primary operational workflow
- chat is expected to become more tightly integrated with agreement exploration over time

## Current tech stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Current database:** PostgreSQL (Neon)
- **Current original file storage:** local filesystem under `storage/originals`
- **PDF text extraction:** Python with `pypdf`
- **PDF in-app preview/search:** custom PDF.js-based viewer under `public/pdfjs`
- **AI / retrieval:** OpenAI file/vector store workflows
- **Auth/session model:** NextAuth-based session/auth flow with Prisma-backed user and membership data

## Current architecture notes

### Database

The project has migrated from SQLite to **PostgreSQL** (hosted on Neon) for development.

The schema now supports:
- users
- chapters
- chapter memberships
- access requests
- access request chapter join records for multi-chapter requests
- invite tokens
- password reset tokens
- knowledge bases
- documents
- extracted text storage
- usage and retrieval event tracking

This supports the long-term goal of hosted, multi-user usage before broader alpha release.

### Original file storage

Original uploaded files are currently stored locally under:

```text
storage/originals