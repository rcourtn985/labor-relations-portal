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
- system administration is expanding to support real user and chapter management before broader alpha use

## Working features

### Agreement database
The main working surface for uploaded agreements.

Current capabilities include:
- agreement list with filtering by chapter, local union, agreement type, state, and national database visibility
- agreement name click-through to open in-app preview
- agreement metadata editing
- extracted-text content search
- side-panel agreement preview
- in-document PDF viewing with search and highlight
- text and PDF inline preview support
- shared/national agreement visibility for chapter admins
- chapter-admin read-only access to out-of-scope nationally shared agreements with direct download

### Upload and storage
Uploads currently:
- create or update agreement records
- store original uploaded files locally
- extract PDF text for agreement content search
- send files into OpenAI/vector-store workflows used by retrieval/chat
- support chapter selection during upload based on user permissions
  - system admins can choose from the full chapter list
  - chapter admins are limited to assigned chapters

### Authentication and access control
Authentication and authorization are now active parts of the application.

Current capabilities include:
- authenticated sign-in flow
- account status tracking (`INVITED`, `ACTIVE`, `DENIED`, `DISABLED`)
- global role support (`SYSTEM_ADMIN`, `STANDARD`)
- chapter membership support with per-chapter roles
- chapter admin restrictions for agreement upload/edit/delete
- public chapter list endpoint used by access-request and admin workflows

### System administration
System administration now includes:
- access request review
- active user management
- updating account status
- assigning and removing chapter memberships
- setting chapter membership role (`USER` or `CHAPTER_ADMIN`)
- updating global role (`STANDARD` or `SYSTEM_ADMIN`)

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
- knowledge bases
- documents
- extracted text storage
- usage and retrieval event tracking

This supports the long-term goal of hosted, multi-user usage before broader alpha release. The current schema includes user account status, global role, and chapter membership role support. 

### Original file storage
Original uploaded files are currently stored locally under:

```text
storage/originals