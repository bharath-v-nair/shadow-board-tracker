using Microsoft.EntityFrameworkCore;
using TrackerAPI.Models;

namespace TrackerAPI.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<Board> Boards { get; set; }
        public DbSet<Tool> Tools { get; set; }
        public DbSet<Worker> Workers { get; set; }
        public DbSet<Incident> Incidents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Worker>().HasData(
                new Worker
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    Name = "Bharath Nair",
                    Email = "nairbharathofficial@gmail.com",
                    IsAvailable = true
                }
            );
        }
    }
}
