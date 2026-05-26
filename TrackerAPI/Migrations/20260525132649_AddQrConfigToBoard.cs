using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrackerAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddQrConfigToBoard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "QrCodeUrl",
                table: "Boards",
                newName: "QrConfig");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "QrConfig",
                table: "Boards",
                newName: "QrCodeUrl");
        }
    }
}
