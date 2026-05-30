using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Models;

namespace TrackerAPI.Application.Features.Tools.Commands
{
    public class CreateToolCommand : IRequest<ToolDto>
    {
        public CreateToolDto Dto { get; set; }

        public CreateToolCommand(CreateToolDto dto)
        {
            Dto = dto;
        }
    }

    public class CreateToolCommandHandler : IRequestHandler<CreateToolCommand, ToolDto>
    {
        private readonly ApplicationDbContext _context;

        public CreateToolCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ToolDto> Handle(CreateToolCommand request, CancellationToken cancellationToken)
        {
            var tool = new Tool
            {
                Id = Guid.NewGuid(),
                Name = request.Dto.Name,
                Type = request.Dto.Type,
                IconName = request.Dto.IconName,
                Condition = request.Dto.Condition,
                BoardId = request.Dto.BoardId
            };

            _context.Tools.Add(tool);
            await _context.SaveChangesAsync(cancellationToken);

            return new ToolDto
            {
                Id = tool.Id,
                Name = tool.Name,
                Type = tool.Type,
                IconName = tool.IconName,
                Condition = tool.Condition,
                BoardId = tool.BoardId
            };
        }
    }
}
