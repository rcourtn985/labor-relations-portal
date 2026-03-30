# Labor Relations Portal

Labor Relations Portal is a Next.js application for building a searchable agreement database and AI-assisted workspace around collective bargaining agreements and related labor documents.

The project is evolving toward a small alpha release focused on:
- uploading and organizing agreements
- searching agreement metadata and extracted agreement text
- previewing agreements in-app
- interacting with agreements through chat/RAG workflows

## Source of truth

This repository is the source of truth for the project.

When making changes:
- use the current repo state, not memory
- verify actual file paths and current code before editing
- prefer small, grounded changes over speculative rewrites

## Current status

The app is currently in active pre-alpha development.

Working areas include:
- agreement upload flow
- agreement metadata capture and editing
- local original file storage
- extracted text storage for agreement content search
- agreement database page with filters and content search
- side-panel agreement preview
- in-document PDF viewing with search and highlight
- in-document text view with search and highlight
- chat retrieval against agreement-related knowledge bases

Current direction:
- the agreement database is becoming the primary user workflow
- chat is becoming a secondary or integrated workflow launched from the database experience
- authentication, hosted storage, and production-ready database work are planned before broader alpha use

## Core features

### Agreement database
The main working surface for uploaded agreements.

Includes:
- agreement list and filters
- agreement name as clickable link to open document preview
- agreement metadata editing
- content search against extracted agreement text
- side-panel document preview with PDF and text view modes
- in-document search toolbar with Context and Precise modes and prev/next navigation

### Upload and storage
Uploads currently:
- create/update agreement records
- store original uploaded files locally
- extract PDF text for searchable agreement content
- upload files to OpenAI/vector store workflows used by chat

### Chat / RAG
The app includes chat workflows that retrieve against agreement-related knowledge bases.

Current intent is for chat to work alongside the agreement database rather than replace it.

## Current tech stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Current database:** PostgreSQL (Neon)
- **Current original file storage:** local filesystem under `storage/originals`
- **PDF text extraction:** Python with `pypdf`
- **PDF in-app preview/search:** custom PDF.js-based viewer page under `public/pdfjs`
- **AI / retrieval:** OpenAI file/vector store workflows

## Current architecture notes

### Database
The project has migrated from SQLite to **PostgreSQL** (hosted on Neon) for development.

This supports the long-term expectation of hosted multi-user usage before broader alpha release.

### Original file storage
Original uploaded files are currently stored locally under:

```text
storage/originals
