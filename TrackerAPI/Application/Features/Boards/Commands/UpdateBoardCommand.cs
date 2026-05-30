using MediatR;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Boards.Commands
{
    // The Message (Returns true if successful, false if not found)
    public class UpdateBoardCommand : IRequest<bool>
    {
        public UpdateBoardDto Dto { get; set; }

        public UpdateBoardCommand(UpdateBoardDto dto)
        {
            Dto = dto;
        }
    }

    // The Handler
    public class UpdateBoardCommandHandler : IRequestHandler<UpdateBoardCommand, bool>
    {
        private readonly ApplicationDbContext _context;

        public UpdateBoardCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(UpdateBoardCommand request, CancellationToken cancellationToken)
        {
            var board = await _context.Boards.FindAsync(new object[] { request.Dto.Id }, cancellationToken);
            
            if (board == null) return false;

            board.Name = request.Dto.Name;
            board.Location = request.Dto.Location;
            board.QrConfig = request.Dto.QrConfig;

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}