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
                    Name = "QA Bharath1",
                    Email = "nairbharathofficial@gmail.com",
                    IsAvailable = true,
                    Role = "QA"
                },
                new Worker
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    Name = "QA Bharath2",
                    Email = "nairbharath21@gmail.com",
                    IsAvailable = true,
                    Role = "QA"
                }
            );

            //Configure the worker relationship
            modelBuilder.Entity<Incident>()
            .HasOne(i => i.Worker)
            .WithMany()
            .HasForeignKey(i => i.WorkerId)
            .OnDelete(DeleteBehavior.Restrict);

            //Configure the Reporter relationship
            modelBuilder.Entity<Incident>()
            .HasOne(i => i.Reporter)
            .WithMany()
            .HasForeignKey(i => i.ReporterId)
            .OnDelete(DeleteBehavior.Restrict);

        }
    }
}
