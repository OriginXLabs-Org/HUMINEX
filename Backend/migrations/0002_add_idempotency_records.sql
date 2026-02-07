CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'core') THEN
        CREATE SCHEMA core;
    END IF;
END $EF$;

CREATE TABLE core.employees (
    "Id" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "EmployeeCode" character varying(32) NOT NULL,
    "Name" character varying(180) NOT NULL,
    "Email" character varying(320) NOT NULL,
    "Role" character varying(120) NOT NULL,
    "Department" character varying(120) NOT NULL,
    "ManagerEmployeeId" uuid,
    "UserId" uuid,
    "IsPortalAccessEnabled" boolean NOT NULL,
    "AllowedWidgetsCsv" character varying(2000) NOT NULL,
    CONSTRAINT "PK_employees" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_employees_employees_ManagerEmployeeId" FOREIGN KEY ("ManagerEmployeeId") REFERENCES core.employees ("Id") ON DELETE RESTRICT
);

CREATE TABLE core.payroll_runs (
    "Id" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "PeriodYear" integer NOT NULL,
    "PeriodMonth" integer NOT NULL,
    "Status" character varying(32) NOT NULL,
    "EmployeesCount" integer NOT NULL,
    "GrossAmount" numeric NOT NULL,
    "NetAmount" numeric NOT NULL,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_payroll_runs" PRIMARY KEY ("Id")
);

CREATE TABLE core.permission_policies (
    "Id" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "PolicyId" character varying(120) NOT NULL,
    "Name" character varying(180) NOT NULL,
    CONSTRAINT "PK_permission_policies" PRIMARY KEY ("Id")
);

CREATE TABLE core.roles (
    "Id" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "Name" character varying(120) NOT NULL,
    "Description" character varying(500) NOT NULL,
    CONSTRAINT "PK_roles" PRIMARY KEY ("Id")
);

CREATE TABLE core.users (
    "Id" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "DisplayName" character varying(180) NOT NULL,
    "Email" character varying(320) NOT NULL,
    "IsActive" boolean NOT NULL,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_users" PRIMARY KEY ("Id")
);

CREATE TABLE core.payslips (
    "Id" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "EmployeeId" uuid NOT NULL,
    "PayrollRunId" uuid,
    "PeriodYear" integer NOT NULL,
    "PeriodMonth" integer NOT NULL,
    "GrossAmount" numeric NOT NULL,
    "DeductionsAmount" numeric NOT NULL,
    "NetAmount" numeric NOT NULL,
    "Status" character varying(32) NOT NULL,
    "LastEmailedAtUtc" timestamp with time zone,
    CONSTRAINT "PK_payslips" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_payslips_employees_EmployeeId" FOREIGN KEY ("EmployeeId") REFERENCES core.employees ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_payslips_payroll_runs_PayrollRunId" FOREIGN KEY ("PayrollRunId") REFERENCES core.payroll_runs ("Id")
);

CREATE TABLE core.permission_policy_permissions (
    "TenantId" uuid NOT NULL,
    "PermissionPolicyEntityId" uuid NOT NULL,
    "Permission" character varying(160) NOT NULL,
    CONSTRAINT "PK_permission_policy_permissions" PRIMARY KEY ("TenantId", "PermissionPolicyEntityId", "Permission"),
    CONSTRAINT "FK_permission_policy_permissions_permission_policies_Permissio~" FOREIGN KEY ("PermissionPolicyEntityId") REFERENCES core.permission_policies ("Id") ON DELETE CASCADE
);

CREATE TABLE core.user_roles (
    "TenantId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "RoleId" uuid NOT NULL,
    CONSTRAINT "PK_user_roles" PRIMARY KEY ("TenantId", "UserId", "RoleId"),
    CONSTRAINT "FK_user_roles_roles_RoleId" FOREIGN KEY ("RoleId") REFERENCES core.roles ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_user_roles_users_UserId" FOREIGN KEY ("UserId") REFERENCES core.users ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_employees_ManagerEmployeeId" ON core.employees ("ManagerEmployeeId");

CREATE UNIQUE INDEX "IX_employees_TenantId_Email" ON core.employees ("TenantId", "Email");

CREATE UNIQUE INDEX "IX_employees_TenantId_EmployeeCode" ON core.employees ("TenantId", "EmployeeCode");

CREATE UNIQUE INDEX "IX_payroll_runs_TenantId_PeriodYear_PeriodMonth" ON core.payroll_runs ("TenantId", "PeriodYear", "PeriodMonth");

CREATE INDEX "IX_payslips_EmployeeId" ON core.payslips ("EmployeeId");

CREATE INDEX "IX_payslips_PayrollRunId" ON core.payslips ("PayrollRunId");

CREATE UNIQUE INDEX "IX_payslips_TenantId_EmployeeId_PeriodYear_PeriodMonth" ON core.payslips ("TenantId", "EmployeeId", "PeriodYear", "PeriodMonth");

CREATE UNIQUE INDEX "IX_permission_policies_TenantId_PolicyId" ON core.permission_policies ("TenantId", "PolicyId");

CREATE INDEX "IX_permission_policy_permissions_PermissionPolicyEntityId" ON core.permission_policy_permissions ("PermissionPolicyEntityId");

CREATE UNIQUE INDEX "IX_roles_TenantId_Name" ON core.roles ("TenantId", "Name");

CREATE INDEX "IX_user_roles_RoleId" ON core.user_roles ("RoleId");

CREATE INDEX "IX_user_roles_UserId" ON core.user_roles ("UserId");

CREATE UNIQUE INDEX "IX_users_TenantId_Email" ON core.users ("TenantId", "Email");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260207070057_InitialIdentityOrganizationPayroll', '8.0.4');

COMMIT;

START TRANSACTION;

CREATE TABLE core.idempotency_records (
    "TenantId" uuid NOT NULL,
    "Key" character varying(128) NOT NULL,
    "HttpMethod" character varying(16) NOT NULL,
    "RequestPath" character varying(512) NOT NULL,
    "StatusCode" integer NOT NULL,
    "ResponseBodyJson" text,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    "ExpiresAtUtc" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_idempotency_records" PRIMARY KEY ("TenantId", "Key", "HttpMethod", "RequestPath")
);

CREATE INDEX "IX_idempotency_records_ExpiresAtUtc" ON core.idempotency_records ("ExpiresAtUtc");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260207120945_AddIdempotencyRecords', '8.0.4');

COMMIT;

