using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrackerAPI.Migrations
{
    /// <inheritdoc />
    public partial class SeedQAAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Workers",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "Name", "Role" },
                values: new object[] { "QA Bharath1", "QA" });

            migrationBuilder.InsertData(
                table: "Workers",
                columns: new[] { "Id", "Email", "IsAvailable", "IsOnShift", "MagicLinkToken", "MagicLinkTokenExpiresAt", "Name", "Role" },
                values: new object[] { new Guid("22222222-2222-2222-2222-222222222222"), "nairbharath21@gmail.com", true, false, null, null, "QA Bharath2", "QA" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Workers",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.UpdateData(
                table: "Workers",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "Name", "Role" },
                values: new object[] { "Bharath Nair", "Worker" });
        }
    }
}
