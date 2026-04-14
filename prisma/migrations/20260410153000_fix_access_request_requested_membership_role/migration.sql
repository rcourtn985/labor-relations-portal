-- Add requestedMembershipRole to AccessRequest
ALTER TABLE "AccessRequest"
ADD COLUMN "requestedMembershipRole" "ChapterMembershipRole" NOT NULL DEFAULT 'USER';

-- Add supporting index
CREATE INDEX "AccessRequest_requestedMembershipRole_idx"
ON "AccessRequest"("requestedMembershipRole");