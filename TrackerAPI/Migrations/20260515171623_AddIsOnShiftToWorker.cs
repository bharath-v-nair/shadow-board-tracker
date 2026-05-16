using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrackerAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddIsOnShiftToWorker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Incidents_Workers_ReporterId",
                table: "Incidents");

            migrationBuilder.AddColumn<bool>(
                name: "IsOnShift",
                table: "Workers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "Workers",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "IsOnShift",
                value: false);

            migrationBuilder.CreateIndex(
                name: "IX_Tools_BoardId",
                table: "Tools",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_ToolId",
                table: "Incidents",
                column: "ToolId");

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_WorkerId",
                table: "Incidents",
                column: "WorkerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Incidents_Tools_ToolId",
                table: "Incidents",
                column: "ToolId",
                principalTable: "Tools",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Incidents_Workers_ReporterId",
                table: "Incidents",
                column: "ReporterId",
                principalTable: "Workers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Incidents_Workers_WorkerId",
                table: "Incidents",
                column: "WorkerId",
                principalTable: "Workers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tools_Boards_BoardId",
                table: "Tools",
                column: "BoardId",
                principalTable: "Boards",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Incidents_Tools_ToolId",
                table: "Incidents");

            migrationBuilder.DropForeignKey(
                name: "FK_Incidents_Workers_ReporterId",
                table: "Incidents");

            migrationBuilder.DropForeignKey(
                name: "FK_Incidents_Workers_WorkerId",
                table: "Incidents");

            migrationBuilder.DropForeignKey(
                name: "FK_Tools_Boards_BoardId",
                table: "Tools");

            migrationBuilder.DropIndex(
                name: "IX_Tools_BoardId",
                table: "Tools");

            migrationBuilder.DropIndex(
                name: "IX_Incidents_ToolId",
                table: "Incidents");

            migrationBuilder.DropIndex(
                name: "IX_Incidents_WorkerId",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "IsOnShift",
                table: "Workers");

            migrationBuilder.AddForeignKey(
                name: "FK_Incidents_Workers_ReporterId",
                table: "Incidents",
                column: "ReporterId",
                principalTable: "Workers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
