using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrackerAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddDemoUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Workers",
                columns: new[] { "Id", "Email", "IsAvailable", "IsOnShift", "MagicLinkToken", "MagicLinkTokenExpiresAt", "Name", "Role" },
                values: new object[] { new Guid("10000000-0000-0000-0000-000000000000"), "demo@factory.com", true, false, null, null, "Demo Recruiter", "DemoViewer" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Workers",
                keyColumn: "Id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000000"));
        }
    }
}
