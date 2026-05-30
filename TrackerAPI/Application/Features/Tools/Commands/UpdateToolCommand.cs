using MediatR;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Tools.Commands
{
    public class UpdateToolCommand : IRequest<bool>
    {
        public UpdateToolDto Dto { get; set; }

        public UpdateToolCommand(UpdateToolDto dto)
        {
            Dto = dto;
        }
    }

    public class UpdateToolCommandHandler : IRequestHandler<UpdateToolCommand, bool>
    {
        private readonly ApplicationDbContext _context;

        public UpdateToolCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(UpdateToolCommand request, CancellationToken cancellationToken)
        {
            var tool = await _context.Tools.FindAsync(new object[] { request.Dto.Id }, cancellationToken);
            if (tool == null)
            {
                return false;
            }

            tool.Name = request.Dto.Name;
            tool.Type = request.Dto.Type;
            tool.IconName = request.Dto.IconName;
            tool.Condition = request.Dto.Condition;
            tool.BoardId = request.Dto.BoardId;

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
