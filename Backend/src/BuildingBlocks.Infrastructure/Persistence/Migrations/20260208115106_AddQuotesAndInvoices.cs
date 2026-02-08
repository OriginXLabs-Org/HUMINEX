using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Huminex.BuildingBlocks.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQuotesAndInvoices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "invoices",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TaxPercent = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    DueDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "quotes",
                schema: "core",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuoteNumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ContactName = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    ContactEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    ContactPhone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    ContactCompany = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    ClientType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    ServiceType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Complexity = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    EstimatedPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    FinalPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quotes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_invoices_TenantId_InvoiceNumber",
                schema: "core",
                table: "invoices",
                columns: new[] { "TenantId", "InvoiceNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoices_TenantId_Status_CreatedAtUtc",
                schema: "core",
                table: "invoices",
                columns: new[] { "TenantId", "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_quotes_TenantId_QuoteNumber",
                schema: "core",
                table: "quotes",
                columns: new[] { "TenantId", "QuoteNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quotes_TenantId_Status_CreatedAtUtc",
                schema: "core",
                table: "quotes",
                columns: new[] { "TenantId", "Status", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "invoices",
                schema: "core");

            migrationBuilder.DropTable(
                name: "quotes",
                schema: "core");
        }
    }
}
