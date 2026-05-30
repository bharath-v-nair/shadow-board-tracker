using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;

namespace TrackerAPI.Application.Features.Boards.Commands
{
    public class PatchBoardQrConfigCommand : IRequest<bool>
    {
        public Guid Id { get; set; }
        public UpdateQrConfigDto Dto { get; set; }

        public PatchBoardQrConfigCommand(Guid id, UpdateQrConfigDto dto)
        {
            Id = id;
            Dto = dto;
        }
    }

    public class PatchBoardQrConfigCommandHandler : IRequestHandler<PatchBoardQrConfigCommand, bool>
    {
        private readonly ApplicationDbContext _context;

        public PatchBoardQrConfigCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(PatchBoardQrConfigCommand request, CancellationToken cancellationToken)
        {
            var board = await _context.Boards.FindAsync(new object[] { request.Id }, cancellationToken);
            
            if (board == null) return false;

            board.QrConfig = request.Dto.QrConfig;
            
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}