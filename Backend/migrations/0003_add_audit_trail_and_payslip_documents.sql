START TRANSACTION;

ALTER TABLE core.payslips ADD "DocumentBlobName" character varying(600);

CREATE TABLE core.audit_trails (
    "Id" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "ActorUserId" uuid NOT NULL,
    "ActorEmail" character varying(320) NOT NULL,
    "Action" character varying(160) NOT NULL,
    "ResourceType" character varying(120) NOT NULL,
    "ResourceId" character varying(200) NOT NULL,
    "Outcome" character varying(40) NOT NULL,
    "MetadataJson" text NOT NULL,
    "OccurredAtUtc" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_audit_trails" PRIMARY KEY ("Id")
);

CREATE INDEX "IX_audit_trails_TenantId_ActorUserId_OccurredAtUtc" ON core.audit_trails ("TenantId", "ActorUserId", "OccurredAtUtc");

CREATE INDEX "IX_audit_trails_TenantId_OccurredAtUtc" ON core.audit_trails ("TenantId", "OccurredAtUtc");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260207163437_AddAuditTrailAndPayslipDocuments', '8.0.4');

COMMIT;

