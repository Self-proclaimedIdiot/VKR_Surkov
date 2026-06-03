using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers.Servs
{
    public class ArenaMatchmakingWorker : BackgroundService
    {
        private readonly ArenaMatchmakingChannel _pool;
        private readonly IHubContext<ChessHub> _hubContext;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        private readonly ConnectionsLog _connectionsLog = new ConnectionsLog();
        private readonly Dictionary<int, List<ArenaSearchRequest>> _waitingRooms = new();

        public ArenaMatchmakingWorker(ArenaMatchmakingChannel pool, IHubContext<ChessHub> hubContext)
        {
            _pool = pool;
            _hubContext = hubContext;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await foreach (var request in _pool.Reader.ReadAllAsync(stoppingToken))
                await MatchPlayers(request);
        }

        private async Task MatchPlayers(ArenaSearchRequest request)
        {
            if (!_waitingRooms.ContainsKey(request.TournamentId))
                _waitingRooms[request.TournamentId] = new List<ArenaSearchRequest>();

            var room = _waitingRooms[request.TournamentId];
            // Убираем повторный вход того же пользователя
            room.RemoveAll(r => r.UserId == request.UserId);

            var opponent = room.FirstOrDefault(r => r.UserId != request.UserId);
            if (opponent != null)
            {
                room.Remove(opponent);
                await StartArenaGame(request, opponent);
            }
            else
            {
                room.Add(request);
            }
        }

        private async Task StartArenaGame(ArenaSearchRequest p1, ArenaSearchRequest p2)
        {
            var tournament = _context.tournaments.FirstOrDefault(t => t.Id == p1.TournamentId);
            if (tournament == null) return;

            // Используем первый доступный формат (блиц) — можно добавить FormatId в Tournament
            int formatId = 1;
            var format = _context.timeFormats.FirstOrDefault(f => f.Id == formatId);
            if (format == null) return;

            Random rng = new Random();
            int colorId = rng.Next(2);
            string whiteUserId = colorId == 0 ? p1.UserId : p2.UserId;
            string blackUserId = colorId == 0 ? p2.UserId : p1.UserId;

            int whitesPlayerId = _context.players.FirstOrDefault(p => p.AccountId.ToString() == whiteUserId)?.Id ?? 0;
            int blacksPlayerId = _context.players.FirstOrDefault(p => p.AccountId.ToString() == blackUserId)?.Id ?? 0;
            if (whitesPlayerId == 0 || blacksPlayerId == 0) return;

            _context.games.Add(new Game
            {
                WhitesId = whitesPlayerId,
                BlacksId = blacksPlayerId,
                FormatId = formatId,
                TournamentId = p1.TournamentId,
                Status = "Active",
                StartTime = DateTime.UtcNow
            });
            _context.SaveChanges();

            var game = _context.games
                .Where(g => g.WhitesId == whitesPlayerId && g.BlacksId == blacksPlayerId
                         && g.TournamentId == p1.TournamentId && g.Status == "Active")
                .OrderByDescending(g => g.Id)
                .FirstOrDefault();
            if (game == null) return;

            string gameId = game.Id.ToString();

            // Добавляем оба соединения в группу ChessHub — тот же механизм что и обычный матчмейкинг
            await _hubContext.Groups.AddToGroupAsync(p1.ConnectionId, gameId);
            await _hubContext.Groups.AddToGroupAsync(p2.ConnectionId, gameId);
            await _connectionsLog.AddLog(p1.ConnectionId, gameId);
            await _connectionsLog.AddLog(p2.ConnectionId, gameId);

            // Шлём тот же GameStarted — DrawBoard подхватит без изменений
            await _hubContext.Clients.Group(gameId).SendAsync("GameStarted", new
            {
                gameId = game.Id,
                white = whiteUserId
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
