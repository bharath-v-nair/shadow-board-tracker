using TrackerAPI.Models;

namespace TrackerAPI.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context)
        {
            // Seed Workers if there are no Floor Workers
            if (!context.Workers.Any(w => w.Role == "Worker"))
            {
                context.Workers.AddRange(
                    new Worker { Id = Guid.NewGuid(), Name = "Worker Alpha", Email = "bravebharath15+alpha@gmail.com", Role = "Worker", IsOnShift = true, IsAvailable = true },
                    new Worker { Id = Guid.NewGuid(), Name = "Worker Beta", Email = "bravebharath15+beta@gmail.com", Role = "Worker", IsOnShift = true, IsAvailable = true },
                    new Worker { Id = Guid.NewGuid(), Name = "Worker Gamma", Email = "bravebharath15+gamma@gmail.com", Role = "Worker", IsOnShift = true, IsAvailable = true },
                    new Worker { Id = Guid.NewGuid(), Name = "Worker Delta", Email = "bravebharath15+delta@gmail.com", Role = "Worker", IsOnShift = false, IsAvailable = true }
                );
                context.SaveChanges();
            }

            // Seed Boards
            if (!context.Boards.Any())
            {
                var boards = new Board[]
                {
                    new Board { Id = Guid.Parse("d947c42a-8c80-4ae8-a5af-125a3e1e0b90"), Name = "Main Maintenance Hub", Location = "Central Workshop", QrConfig = "{\"size\":300,\"showLabel\":true}" },
                    new Board { Id = Guid.Parse("04faebe1-af4b-4071-936d-2528fd4a9fa9"), Name = "Assembly Line Test B", Location = "Testing Area B", QrConfig = null },
                    new Board { Id = Guid.Parse("0e0a6a49-a823-467c-94cc-c61fdf2d3ce5"), Name = "Assembly Line A", Location = "East Wing, Conveyor 1", QrConfig = null },
                    new Board { Id = Guid.Parse("9aa26f72-1e7c-4e3a-97c1-d31e0a14fc22"), Name = "Welding Station Board", Location = "Heavy Fab Area", QrConfig = null },
                    new Board { Id = Guid.Parse("e0dc5010-2bee-4c32-84cf-fcc98fad1e39"), Name = "Oven Area Board", Location = "North Wing, Line 1", QrConfig = null }
                };
                context.Boards.AddRange(boards);
                context.SaveChanges();
            }

            // Seed Tools
            if (!context.Tools.Any())
            {
                var tools = new Tool[]
                {
                    new Tool { Id = Guid.NewGuid(), Name = "Blue Wrench", Type = "Maintenance", IconName = "build", Condition = "Good", BoardId = Guid.Parse("e0dc5010-2bee-4c32-84cf-fcc98fad1e39") },
                    new Tool { Id = Guid.NewGuid(), Name = "Lockout/Tagout Kit", Type = "Safety", IconName = null, Condition = "Good", BoardId = Guid.Parse("d947c42a-8c80-4ae8-a5af-125a3e1e0b90") },
                    new Tool { Id = Guid.NewGuid(), Name = "Cordless Drill", Type = "Power Tool", IconName = "build", Condition = "Good", BoardId = Guid.Parse("0e0a6a49-a823-467c-94cc-c61fdf2d3ce5") },
                    new Tool { Id = Guid.NewGuid(), Name = "Safety Goggles", Type = "PPE", IconName = "visibility", Condition = "Good", BoardId = Guid.Parse("0e0a6a49-a823-467c-94cc-c61fdf2d3ce5") },
                    new Tool { Id = Guid.NewGuid(), Name = "Welding Mask", Type = "PPE", IconName = "mask", Condition = "Good", BoardId = Guid.Parse("9aa26f72-1e7c-4e3a-97c1-d31e0a14fc22") },
                    new Tool { Id = Guid.NewGuid(), Name = "Push Broom", Type = "Cleaning", IconName = null, Condition = "Damaged", BoardId = Guid.Parse("d947c42a-8c80-4ae8-a5af-125a3e1e0b90") },
                    new Tool { Id = Guid.NewGuid(), Name = "Safety Goggles", Type = "PPE", IconName = "visibility", Condition = "Good", BoardId = Guid.Parse("d947c42a-8c80-4ae8-a5af-125a3e1e0b90") },
                    new Tool { Id = Guid.NewGuid(), Name = "Blue Wrench", Type = "Hand Tool", IconName = "build", Condition = "Good", BoardId = Guid.Parse("d947c42a-8c80-4ae8-a5af-125a3e1e0b90") },
                    new Tool { Id = Guid.NewGuid(), Name = "Heavy Gloves", Type = "PPE", IconName = "front_hand", Condition = "Good", BoardId = Guid.Parse("9aa26f72-1e7c-4e3a-97c1-d31e0a14fc22") },
                    new Tool { Id = Guid.NewGuid(), Name = "Blue Wrench", Type = "Hand Tool", IconName = "build", Condition = "Good", BoardId = Guid.Parse("0e0a6a49-a823-467c-94cc-c61fdf2d3ce5") },
                    new Tool { Id = Guid.NewGuid(), Name = "Safety Goggles", Type = "PPE", IconName = "visibility", Condition = "Good", BoardId = Guid.Parse("e0dc5010-2bee-4c32-84cf-fcc98fad1e39") },
                    new Tool { Id = Guid.NewGuid(), Name = "Red Wrench", Type = "Hand Tool", IconName = "build", Condition = "Good", BoardId = Guid.Parse("d947c42a-8c80-4ae8-a5af-125a3e1e0b90") },
                    new Tool { Id = Guid.NewGuid(), Name = "Wire Brush", Type = "Cleaning", IconName = "cleaning_services", Condition = "Good", BoardId = Guid.Parse("9aa26f72-1e7c-4e3a-97c1-d31e0a14fc22") },
                    new Tool { Id = Guid.NewGuid(), Name = "Duct Tape", Type = "Consumable", IconName = "inventory_2", Condition = "Good", BoardId = Guid.Parse("d947c42a-8c80-4ae8-a5af-125a3e1e0b90") },
                    new Tool { Id = Guid.NewGuid(), Name = "Voltage Tester", Type = "Diagnostic", IconName = "electric_bolt", Condition = "Good", BoardId = Guid.Parse("d947c42a-8c80-4ae8-a5af-125a3e1e0b90") },
                    new Tool { Id = Guid.NewGuid(), Name = "Red Shovel", Type = "Cleaning", IconName = "cleaning_services", Condition = "Good", BoardId = Guid.Parse("e0dc5010-2bee-4c32-84cf-fcc98fad1e39") },
                    new Tool { Id = Guid.NewGuid(), Name = "Chipping Hammer", Type = "Hand Tool", IconName = "hardware", Condition = "Good", BoardId = Guid.Parse("9aa26f72-1e7c-4e3a-97c1-d31e0a14fc22") }
                };
                context.Tools.AddRange(tools);
                context.SaveChanges();
            }
        }
    }
}
