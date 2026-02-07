using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditTrailAndPayslipDocuments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DocumentBlobName",
                schema: "core",
                table: "payslips",
                type: "character varying(600)",
                maxLength: 600,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "audit_trails",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Action = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    ResourceType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ResourceId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Outcome = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    MetadataJson = table.Column<string>(type: "text", nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_trails", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_trails_TenantId_ActorUserId_OccurredAtUtc",
                schema: "core",
                table: "audit_trails",
                columns: new[] { "TenantId", "ActorUserId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_trails_TenantId_OccurredAtUtc",
                schema: "core",
                table: "audit_trails",
                columns: new[] { "TenantId", "OccurredAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_trails",
                schema: "core");

            migrationBuilder.DropColumn(
                name: "DocumentBlobName",
                schema: "core",
                table: "payslips");
        }
    }
}
