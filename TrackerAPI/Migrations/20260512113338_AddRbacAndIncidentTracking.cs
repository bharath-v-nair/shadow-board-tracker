using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrackerAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddRbacAndIncidentTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Workers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "ReporterId",
                table: "Incidents",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.UpdateData(
                table: "Workers",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "Role",
                value: "Worker");

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_ReporterId",
                table: "Incidents",
                column: "ReporterId");

            migrationBuilder.AddForeignKey(
                name: "FK_Incidents_Workers_ReporterId",
                table: "Incidents",
                column: "ReporterId",
                principalTable: "Workers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Incidents_Workers_ReporterId",
                table: "Incidents");

            migrationBuilder.DropIndex(
                name: "IX_Incidents_ReporterId",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Workers");

            migrationBuilder.DropColumn(
                name: "ReporterId",
                table: "Incidents");
        }
    }
}
