using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;
using TrackerAPI.Data;
using TrackerAPI.DTOs;
using TrackerAPI.Models;

namespace TrackerAPI.Application.Features.Boards.Commands
{
    // 1. The Message (Carries the payload from the Frontend)
    public class CreateBoardCommand : IRequest<BoardDto>
    {
        public CreateBoardDto Dto { get; set; }

        public CreateBoardCommand(CreateBoardDto dto)
        {
            Dto = dto;
        }
    }

    // 2. The Handler (Modifies the database)
    public class CreateBoardCommandHandler : IRequestHandler<CreateBoardCommand, BoardDto>
    {
        private readonly ApplicationDbContext _context;

        public CreateBoardCommandHandler(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<BoardDto> Handle(CreateBoardCommand request, CancellationToken cancellationToken)
        {
            // 1. Map the DTO to the real Entity
            var board = new Board
            {
                Id = Guid.NewGuid(),
                Name = request.Dto.Name,
                Location = request.Dto.Location,
                QrConfig = request.Dto.QrConfig
            };

            // 2. Save it to the database
            _context.Boards.Add(board);
            await _context.SaveChangesAsync(cancellationToken);

            // 3. Map the Entity back to a DTO to return to the frontend
            return new BoardDto
            {
                Id = board.Id,
                Name = board.Name,
                Location = board.Location,
                QrConfig = board.QrConfig
            };
        }
    }
}