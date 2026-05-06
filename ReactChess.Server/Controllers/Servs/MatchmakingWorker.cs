using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers.Servs
{
    public class MatchmakingWorker : BackgroundService
    {
        private readonly MatchmakingChannel _pool;
        private readonly IHubContext<ChessHub> _hubContext;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        private readonly Dictionary<string, List<SearchRequest>> _waitingRooms = new();
        private readonly ConnectionsLog connectionsLog = new ConnectionsLog();
        public MatchmakingWorker(MatchmakingChannel pool, IHubContext<ChessHub> hubContext)
        {
            _pool = pool;
            _hubContext = hubContext;
        }
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Читаем из канала, пока приложение работает
            await foreach (var request in _pool.Reader.ReadAllAsync(stoppingToken))
            {
                await MatchPlayers(request);
            }
        }
        private async Task MatchPlayers(SearchRequest request)
        {
            if (!_waitingRooms.ContainsKey(request.TimeFormatId))
                _waitingRooms[request.TimeFormatId] = new List<SearchRequest>();
            var room = _waitingRooms[request.TimeFormatId];
            if (room.Count > 0)
            {
                var sender_playerId = _context.players.Where(p => p.AccountId.ToString() == request.UserId)
                       .FirstOrDefault()?.Id;
                var sender_elo = _context.elos.Where(e => e.PlayerId == sender_playerId &&
                e.FormatId.ToString() == request.TimeFormatId)
                    .FirstOrDefault()?.Number;
                List<SearchRequest> closeElos = new List<SearchRequest>();
                int difference = 25;
                while(closeElos.Count == 0)
                {
                    closeElos = room.Where(r =>
                    {
                        var playerId = _context.players.Where(p => p.AccountId.ToString() == r.UserId)
                        .FirstOrDefault()?.Id;
                        var elo = _context.elos.Where(e => e.PlayerId == playerId &&
                        e.FormatId.ToString() == r.TimeFormatId)
                        .FirstOrDefault()?.Number;
                        return Math.Abs(Convert.ToDecimal(sender_elo - elo)) <= difference;
                    }).ToList();
                    difference *= 2;
                }
                var opponent_request = closeElos[0];
                room.Remove(closeElos[0]);
                await StartGame(request, opponent_request);
            }
            else
            {
                // Никого нет, добавляем в ожидание
                room.Add(request);
            }
        }
        private async Task StartGame(SearchRequest p1, SearchRequest p2)
        {
            //var gameId = Guid.NewGuid().ToString();
            Random random = new Random();
            int whitesId = 0;
            int blacksId = 0;
            int colorIdentifier = random.Next(2);
            if (colorIdentifier == 0)
            {
                whitesId = _context.players.Where(p => p.AccountId.ToString() == p1.UserId)
                    .FirstOrDefault().Id;
                blacksId = _context.players.Where(p => p.AccountId.ToString() == p2.UserId)
                    .FirstOrDefault().Id;
            }
            else
            {
                whitesId = _context.players.Where(p => p.AccountId.ToString() == p2.UserId)
                    .FirstOrDefault().Id;
                blacksId = _context.players.Where(p => p.AccountId.ToString() == p1.UserId)
                    .FirstOrDefault().Id;
            }
            _context.games.Add(new Game {
                WhitesId = whitesId,
                BlacksId = blacksId,
                FormatId = Convert.ToInt32(p1.TimeFormatId),
                Status = "Active",
                StartTime = DateTime.UtcNow
            });
            _context.SaveChanges();
            var game = _context.games.Where(g => g.WhitesId == whitesId &&
                                              g.BlacksId == blacksId &&
                                              g.FormatId.ToString() == p1.TimeFormatId &&
                                              g.Status == "Active").FirstOrDefault();
            var gameId = game?.Id.ToString();
            await _hubContext.Groups.AddToGroupAsync(p1.ConnectionId, gameId);
            await _hubContext.Groups.AddToGroupAsync(p2.ConnectionId, gameId);
            await connectionsLog.AddLog(p1.ConnectionId, gameId);
            await connectionsLog.AddLog(p2.ConnectionId, gameId);
            await _hubContext.Clients.Group(gameId).SendAsync("GameStarted", new
            {
                GameId = gameId,
                White = colorIdentifier == 0 ? p1.UserId : p2.UserId,
                Black = colorIdentifier == 0 ? p2.UserId : p1.UserId
            });
            await _hubContext.Clients.Group(gameId).SendAsync("OffsetCorrect", new
            {
                ServerTime = (DateTime.Now - new DateTime(1970, 1, 1, 3, 0, 0, 0)).TotalMilliseconds
            });
            game.StartTime = DateTime.UtcNow;
            _context.SaveChanges();
        }
    }
}
