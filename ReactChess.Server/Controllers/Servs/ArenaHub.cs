using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers.Servs
{
    public class ArenaHub : Hub
    {
        private readonly ArenaMatchmakingChannel _pool;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        private readonly EloHandler _eloHandler = new EloHandler();
        private readonly ChessLogicHandler _logicHandler = new ChessLogicHandler();
        private readonly ConnectionsLog _connectionsLog = new ConnectionsLog();
        private readonly ConnectionIdsLog _idsLog = new ConnectionIdsLog();

        // Активные лобби: tournamentId -> список accountId онлайн в лобби
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, HashSet<string>>
            _lobbyUsers = new();

        public ArenaHub(ArenaMatchmakingChannel pool)
        {
            _pool = pool;
        }

        // ──────────────────────────────────────────────
        // ЛОББИ
        // ──────────────────────────────────────────────

        /// Войти в лобби турнира (показать своё присутствие, начать поиск соперника)
        public async Task JoinArenaLobby(int tournamentId)
        {
            string userId = Context.UserIdentifier;
            string lobbyGroup = $"arena-lobby-{tournamentId}";

            await Groups.AddToGroupAsync(Context.ConnectionId, lobbyGroup);

            _lobbyUsers.AddOrUpdate(tournamentId,
                _ => new HashSet<string> { userId },
                (_, set) => { set.Add(userId); return set; });

            // Сообщаем всем в лобби обновлённый список участников онлайн
            await BroadcastLobbyPresence(tournamentId);
        }

        /// Покинуть лобби (без поиска игры)
        public async Task LeaveLobbyWithoutSearch(int tournamentId)
        {
            string lobbyGroup = $"arena-lobby-{tournamentId}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, lobbyGroup);

            if (_lobbyUsers.TryGetValue(tournamentId, out var set))
            {
                set.Remove(Context.UserIdentifier);
                await BroadcastLobbyPresence(tournamentId);
            }
        }

        /// Встать в очередь поиска соперника в рамках турнира
        public async Task JoinArenaQueue(int tournamentId)
        {
            var request = new ArenaSearchRequest(Context.UserIdentifier, Context.ConnectionId, tournamentId);
            if (!_pool.Writer.TryWrite(request))
                await Clients.Caller.SendAsync("Error", "Очередь переполнена, попробуйте позже");
        }

        // ──────────────────────────────────────────────
        // ИГРА (аналог ChessHub, но обновляет счёт арены)
        // ──────────────────────────────────────────────

        public async Task JoinArenaGroup(int gameId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, gameId.ToString());
            await _connectionsLog.AddLog(Context.ConnectionId, gameId.ToString());
        }

        public async Task SendArenaMove(string gameId_s, string FEN, string status)
        {
            DateTime now = DateTime.Now;
            int gameId = Convert.ToInt32(gameId_s);
            var game = await _context.games.Where(g => g.Id == gameId).FirstOrDefaultAsync();
            if (game == null) return;

            TimeFormat format = await _context.timeFormats.Where(tf => tf.Id == game.FormatId).FirstOrDefaultAsync();
            TimeSpan remaining_time = format.Time;
            DateTime start = game.StartTime;

            Move move_before = null, move_before_before = null;
            var prevMoves = await _context.moves.Where(m => m.GameId == gameId)
                .OrderByDescending(m => m.Id).Take(2).ToListAsync();
            if (prevMoves.Count > 0) { move_before = prevMoves[0]; if (prevMoves.Count > 1) move_before_before = prevMoves[1]; }

            string prevFEN = move_before?.FEN ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            if (move_before != null) start = move_before.AbsoluteTime;
            if (move_before_before != null) remaining_time = move_before_before.Time;

            DateTime ending = start + remaining_time + format.AddTime;
            TimeSpan time = ending - now;

            int playerId = (await _context.players.Where(p => p.AccountId.ToString() == Context.UserIdentifier).FirstOrDefaultAsync()).Id;
            int opponentId = status.Split(" ")[1] == "White" ? game.BlacksId : game.WhitesId;

            // Время вышло
            if (DateTime.Now > ending)
            {
                string color = game.WhitesId == playerId ? "Black" : "White";
                var (myOld, myNew, oppOld, oppNew) = await HandleArenaResult(game, opponentId, playerId, isDraw: false);

                await Clients.Client(Context.ConnectionId).SendAsync("ArenaMoveReceived", new
                {
                    FEN = "no_fen", Status = $"TimesUp {color}", GameOver = true,
                    GameOverData = new { message = "Вы проиграли по времени!", old_elo = myOld, new_elo = myNew }
                });
                await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("ArenaMoveReceived", new
                {
                    FEN = "no_fen", Status = $"TimesUp {color}", GameOver = true,
                    GameOverData = new { message = "Вы победили по времени!", old_elo = oppOld, new_elo = oppNew }
                });
                return;
            }

            string moveNote = _logicHandler.CheckFEN(prevFEN, FEN);
            if (moveNote == "Verification failed") return;

            _context.moves.Add(new Move { GameId = gameId, FEN = FEN, Time = time, AbsoluteTime = DateTime.UtcNow });
            DateTime at_publish = DateTime.Now;

            bool game_over = false;
            string message = "", opponent_message = "";
            int old_elo = 0, new_elo = 0, opponent_old_elo = 0, opponent_new_elo = 0;

            if (status.Split(' ')[0] is "Checkmate" or "Stalemate" or "Draw50" or "NoMaterial")
            {
                bool isDraw = status.Split(' ')[0] != "Checkmate";
                (old_elo, new_elo, opponent_old_elo, opponent_new_elo) =
                    await HandleArenaResult(game, playerId, opponentId, isDraw);
                message = isDraw ? "Ничья" : "Вы поставили мат!";
                opponent_message = isDraw ? "Ничья" : "Вам поставили мат!";
                game_over = true;

                await Clients.Client(Context.ConnectionId).SendAsync("ArenaMoveReceived", new
                {
                    FEN, Status = status, GameOver = true,
                    GameOverData = new { message, old_elo, new_elo }
                });
            }
            else
            {
                // Троекратное повторение
                var same = await _context.moves.Where(m => m.GameId == gameId).ToListAsync();
                same.RemoveAll(m => !_logicHandler.FENEqual(m.FEN, FEN));
                if (same.Count >= 2)
                {
                    game.Status = "DrawRepetition";
                    (old_elo, new_elo, opponent_old_elo, opponent_new_elo) =
                        await HandleArenaResult(game, playerId, opponentId, isDraw: true);
                    message = opponent_message = "Ничья! Троекратное повторение позиции";
                    game_over = true;
                    await Clients.Client(Context.ConnectionId).SendAsync("ArenaMoveReceived", new
                    {
                        FEN, Status = status, GameOver = true,
                        GameOverData = new { message, old_elo, new_elo }
                    });
                }
            }

            _context.SaveChanges();

            await Clients.Client(Context.ConnectionId).SendAsync("TimeCorrect", new
            {
                Time = (ending - new DateTime(1970, 1, 1, 3, 0, 0, 0)).TotalMilliseconds, Own = true
            });
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("TimeCorrect", new
            {
                Time = (ending - new DateTime(1970, 1, 1, 3, 0, 0, 0)).TotalMilliseconds,
                Own = false,
                TimeAtPublish = (at_publish - new DateTime(1970, 1, 1, 3, 0, 0, 0)).TotalMilliseconds
            });
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("ArenaMoveReceived", new
            {
                FEN, Status = status, GameOver = game_over,
                GameOverData = new { message = opponent_message, old_elo = opponent_old_elo, new_elo = opponent_new_elo },
                MoveNote = moveNote
            });
        }

        public async Task SendArenaConcede(string gameId_s)
        {
            int gameId = Convert.ToInt32(gameId_s);
            var game = await _context.games.Where(g => g.Id == gameId).FirstOrDefaultAsync();
            int playerId = (await _context.players.Where(p => p.AccountId.ToString() == Context.UserIdentifier).FirstOrDefaultAsync()).Id;
            int opponentId = game.WhitesId == playerId ? game.BlacksId : game.WhitesId;
            string color = game.WhitesId == playerId ? "Black" : "White";
            game.Status = $"Concede {color}";

            var (old_elo, new_elo, opp_old, opp_new) = await HandleArenaResult(game, opponentId, playerId, isDraw: false);
            _context.SaveChanges();

            await Clients.Client(Context.ConnectionId).SendAsync("ArenaMoveReceived", new
            {
                FEN = "no_fen", Status = $"Concede {color}", GameOver = true,
                GameOverData = new { message = "Вы сдались", old_elo, new_elo }
            });
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("ArenaMoveReceived", new
            {
                FEN = "no_fen", Status = $"Concede {color}", GameOver = true,
                GameOverData = new { message = "Соперник сдался", old_elo = opp_old, new_elo = opp_new }
            });
        }

        public async Task SendArenaTimesUp(string gameId_s)
        {
            int gameId = Convert.ToInt32(gameId_s);
            var game = await _context.games.Where(g => g.Id == gameId).FirstOrDefaultAsync();
            int playerId = (await _context.players.Where(p => p.AccountId.ToString() == Context.UserIdentifier).FirstOrDefaultAsync()).Id;
            int opponentId = game.WhitesId == playerId ? game.BlacksId : game.WhitesId;
            string color = game.WhitesId == playerId ? "Black" : "White";
            game.Status = $"TimesUp {color}";

            var (old_elo, new_elo, opp_old, opp_new) = await HandleArenaResult(game, opponentId, playerId, isDraw: false);
            _context.SaveChanges();

            await Clients.Client(Context.ConnectionId).SendAsync("ArenaMoveReceived", new
            {
                FEN = "no_fen", Status = $"TimesUp {color}", GameOver = true,
                GameOverData = new { message = "Вы проиграли по времени!", old_elo, new_elo }
            });
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("ArenaMoveReceived", new
            {
                FEN = "no_fen", Status = $"TimesUp {color}", GameOver = true,
                GameOverData = new { message = "Вы победили по времени!", old_elo = opp_old, new_elo = opp_new }
            });
        }

        public async Task AskForArenaDrawAsync(string gameId_s) =>
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("ArenaDrawReceived");

        public async Task AcceptArenaDraw(string gameId_s)
        {
            int gameId = Convert.ToInt32(gameId_s);
            var game = await _context.games.Where(g => g.Id == gameId).FirstOrDefaultAsync();
            int playerId = (await _context.players.Where(p => p.AccountId.ToString() == Context.UserIdentifier).FirstOrDefaultAsync()).Id;
            int opponentId = game.WhitesId == playerId ? game.BlacksId : game.WhitesId;
            game.Status = "Draw";

            var (old_elo, new_elo, opp_old, opp_new) = await HandleArenaResult(game, playerId, opponentId, isDraw: true);
            _context.SaveChanges();

            var msg = new { FEN = "no_fen", Status = "Draw", GameOver = true, GameOverData = new { message = "Ничья по согласию", old_elo, new_elo } };
            var oppMsg = new { FEN = "no_fen", Status = "Draw", GameOver = true, GameOverData = new { message = "Ничья по согласию", old_elo = opp_old, new_elo = opp_new } };
            await Clients.Client(Context.ConnectionId).SendAsync("ArenaMoveReceived", msg);
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("ArenaMoveReceived", oppMsg);
        }

        public async Task DenyArenaDraw(string gameId_s) =>
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("ArenaDrawDenied");

        // ──────────────────────────────────────────────
        // ПОДКЛЮЧЕНИЕ / ОТКЛЮЧЕНИЕ
        // ──────────────────────────────────────────────

        public override async Task OnConnectedAsync()
        {
            await _idsLog.AddLog(Context.UserIdentifier, Context.ConnectionId);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            string gameId_s = await _connectionsLog.GetGroupId(Context.ConnectionId);
            if (gameId_s != "NoGroup")
            {
                int gameId = Convert.ToInt32(gameId_s);
                var game = await _context.games.Where(g => g.Id == gameId).FirstOrDefaultAsync();
                if (game?.Status == "Active")
                {
                    int playerId = (await _context.players.Where(p => p.AccountId.ToString() == Context.UserIdentifier).FirstOrDefaultAsync()).Id;
                    int opponentId = game.WhitesId == playerId ? game.BlacksId : game.WhitesId;
                    string color = game.WhitesId == playerId ? "Black" : "White";
                    game.Status = $"PlayerLeft {color}";
                    var (_, _, opp_old, opp_new) = await HandleArenaResult(game, opponentId, playerId, isDraw: false);
                    _context.SaveChanges();
                    await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("ArenaMoveReceived", new
                    {
                        FEN = "no_fen", Status = $"TimesUp {color}", GameOver = true,
                        GameOverData = new { message = "Противник вышел!", old_elo = opp_old, new_elo = opp_new }
                    });
                }
                await _connectionsLog.RemoveLog(Context.ConnectionId, gameId_s);
            }

            // Убираем из лобби
            foreach (var (tournamentId, set) in _lobbyUsers)
            {
                if (set.Remove(Context.UserIdentifier))
                    await BroadcastLobbyPresence(tournamentId);
            }

            await _idsLog.RemoveLog(Context.UserIdentifier, Context.ConnectionId);
            await base.OnDisconnectedAsync(exception);
        }

        // ──────────────────────────────────────────────
        // ХЕЛПЕРЫ
        // ──────────────────────────────────────────────

        /// Обновляет ELO и счёт арены. Возвращает (winnerOldElo, winnerNewElo, loserOldElo, loserNewElo).
        /// winner/loser — PlayerId когда isDraw=false; при ничье порядок не важен.
        private async Task<(int myOld, int myNew, int oppOld, int oppNew)> HandleArenaResult(
            Game game, int winnerId, int loserId, bool isDraw)
        {
            // ELO
            int[] newElos = await _eloHandler.HandleElo(winnerId, loserId, game.FormatId, isDraw);
            int winnerOld = (await _context.elos.Where(e => e.PlayerId == winnerId && e.FormatId == game.FormatId).FirstOrDefaultAsync())?.Number ?? 0;
            int loserOld = (await _context.elos.Where(e => e.PlayerId == loserId && e.FormatId == game.FormatId).FirstOrDefaultAsync())?.Number ?? 0;

            if (game.TournamentId.HasValue)
            {
                int tournamentId = game.TournamentId.Value;

                int winnerAccountId = (await _context.players.Where(p => p.Id == winnerId).FirstOrDefaultAsync())?.AccountId ?? 0;
                int loserAccountId = (await _context.players.Where(p => p.Id == loserId).FirstOrDefaultAsync())?.AccountId ?? 0;

                if (winnerAccountId > 0 && loserAccountId > 0)
                {
                    var winnerScore = _context.tournamentArenaScores
                        .FirstOrDefault(s => s.TournamentId == tournamentId && s.AccountId == winnerAccountId)
                        ?? CreateScore(tournamentId, winnerAccountId);

                    var loserScore = _context.tournamentArenaScores
                        .FirstOrDefault(s => s.TournamentId == tournamentId && s.AccountId == loserAccountId)
                        ?? CreateScore(tournamentId, loserAccountId);

                    if (isDraw) { winnerScore.Draws++; loserScore.Draws++; }
                    else { winnerScore.Wins++; loserScore.Losses++; }

                    _context.SaveChanges();

                    // Рассылаем обновлённую таблицу лобби
                    await BroadcastLeaderboard(tournamentId);
                }
            }

            return (winnerOld, newElos[0], loserOld, newElos[1]);
        }

        private TournamentArenaScore CreateScore(int tournamentId, int accountId)
        {
            var score = new TournamentArenaScore { TournamentId = tournamentId, AccountId = accountId };
            _context.tournamentArenaScores.Add(score);
            _context.SaveChanges();
            return score;
        }

        private async Task BroadcastLobbyPresence(int tournamentId)
        {
            _lobbyUsers.TryGetValue(tournamentId, out var onlineSet);
            var onlineIds = onlineSet?.ToList() ?? new List<string>();

            var lobbyData = onlineIds.Select(uid =>
            {
                int accId = int.Parse(uid);
                var acc = _context.accounts.FirstOrDefault(a => a.Id == accId);
                var pl = _context.players.FirstOrDefault(p => p.AccountId == accId);
                return new { accountId = accId, login = acc?.Login ?? "—", title = pl?.Title };
            }).ToList();

            await Clients.Group($"arena-lobby-{tournamentId}").SendAsync("LobbyPresenceUpdated", new
            {
                players = lobbyData
            });
        }

        private async Task BroadcastLeaderboard(int tournamentId)
        {
            var scores = _context.tournamentArenaScores
                .Where(s => s.TournamentId == tournamentId)
                .ToList();

            var leaderboard = scores.Select(s =>
            {
                var acc = _context.accounts.FirstOrDefault(a => a.Id == s.AccountId);
                var pl = _context.players.FirstOrDefault(p => p.AccountId == s.AccountId);
                return new
                {
                    accountId = s.AccountId,
                    login = acc?.Login ?? "—",
                    title = pl?.Title,
                    wins = s.Wins,
                    draws = s.Draws,
                    losses = s.Losses,
                    points = s.Wins * 2 + s.Draws // 2 за победу, 1 за ничью
                };
            })
            .OrderByDescending(s => s.points)
            .ThenByDescending(s => s.wins)
            .ToList();

            await Clients.Group($"arena-lobby-{tournamentId}").SendAsync("LeaderboardUpdated", new
            {
                leaderboard
            });
        }
    }
}
