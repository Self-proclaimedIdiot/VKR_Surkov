using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Npgsql.TypeMapping;
using ReactChess.Server.Models;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using static System.Runtime.InteropServices.JavaScript.JSType;
namespace ReactChess.Server.Controllers.Servs
{
    public class GameStateModel
    {
        public string Side { get; set; }
        public bool IsStarted { get; set; }
    }
    public class ChessHub : Hub
    {
        private readonly MatchmakingChannel _pool;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        private readonly EloHandler elo_handler = new EloHandler();
        private readonly ChessLogicHandler logic_handler = new ChessLogicHandler(); 
        public ChessHub(MatchmakingChannel pool) { _pool = pool; }
        //заход в очередь
        public async Task JoinQueue(int format_n)
        {
            string format = format_n.ToString();
            var request = new SearchRequest(Context.UserIdentifier, Context.ConnectionId, format);
            if (!_pool.Writer.TryWrite(request))
            {
                await Clients.Caller.SendAsync("Error", "Очередь переполнена, попробуйте позже");
            }
        }
        public async Task SendMove(string gameId_s, string FEN, string status)
        {
            //определяем айди игры, что идет у приславшего
            DateTime now_at_the_start = DateTime.Now;
            int gameId = Convert.ToInt32(gameId_s);
            var game = await _context.games.Where(g => g.Id == gameId).FirstOrDefaultAsync();
            TimeFormat format = await _context.timeFormats.Where(tf => tf.Id == game.FormatId).FirstOrDefaultAsync();
            TimeSpan remaining_time = format.Time;
            DateTime start = game.StartTime;
            Move move_before = null;
            Move move_before_before = null;
            var previous_moves = await _context.moves.Where(m => m.GameId == gameId).OrderByDescending(m => m.Id).Take(2).ToListAsync();
            if (previous_moves.Count > 0)
            {
                move_before = previous_moves[0];
                if (previous_moves.Count > 1)
                    move_before_before = previous_moves[1];
            }
            string move_before_FEN;
            if (move_before != null)
            {
                move_before_FEN = move_before.FEN;
                start = move_before.AbsoluteTime;
            }
            else move_before_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            if (move_before_before != null)
                remaining_time = move_before_before.Time;
            DateTime ending = start + remaining_time + format.AddTime;
            TimeSpan time = ending - now_at_the_start;
            int playerId = (await _context.players.
                Where(p => p.AccountId.ToString() == Context.UserIdentifier)
                .FirstOrDefaultAsync()).Id;
            int opponentId = status.Split(" ")[1] == "White" ? game.BlacksId : game.WhitesId;
            string message = "";
            string opponent_message = "";
            int old_elo = 0;
            int new_elo = 0;
            int opponent_old_elo = 0;
            int opponent_new_elo = 0;
            bool game_over = false;
            if (DateTime.Now > ending)
            {
                string color = game.WhitesId == playerId ? "Black" : "White";
                old_elo = (await _context.elos.Where(e => e.PlayerId == playerId && e.FormatId == game.FormatId)
                            .FirstOrDefaultAsync()).Number;
                opponent_old_elo = (await _context.elos.Where(e => e.PlayerId == opponentId && e.FormatId == game.FormatId)
                    .FirstOrDefaultAsync()).Number;
                int[] new_elos = await elo_handler.HandleElo(opponentId, playerId, game.FormatId, false);
                new_elo = new_elos[1];
                opponent_new_elo = new_elos[0];
                await Clients.Client(Context.ConnectionId).SendAsync("MoveReceived", new
                {
                    FEN = "no_fen",
                    Status = $"TimesUp {color}",
                    GameOver = true,
                    GameOverData = new
                    {
                        message = "Вы проиграли по времени!",
                        old_elo = old_elo,
                        new_elo = new_elo
                    }
                });
                await Clients.GroupExcept(gameId.ToString(), Context.ConnectionId).SendAsync("MoveReceived", new
                {
                    FEN = "no_fen",
                    Status = $"TimesUp {color}",
                    GameOver = true,
                    GameOverData = new
                    {
                        message = "Вы выиграли по времени!",
                        old_elo = opponent_old_elo,
                        new_elo = opponent_new_elo
                    }
                });
            }
            else
            {
                //Console.WriteLine(logic_handler.CheckFEN(move_before_FEN, FEN));
                string move_note = logic_handler.CheckFEN(move_before_FEN, FEN);
                if (move_note != "Verification failed")
                {
                    //пишем его ход в базу
                    _context.moves.Add(new Move
                    {
                        GameId = gameId,
                        FEN = FEN,
                        Time = time,
                        AbsoluteTime = DateTime.UtcNow
                    });
                    DateTime at_publish = DateTime.Now;
                    //если имеем дело с феном, обозначающим конец игры
                    //что характерно, если это мат, то гарантированно приславший - победитель, и никак иначе
                    if (status.Split(' ')[0] == "Checkmate" ||
                        status.Split(' ')[0] == "Stalemate" ||
                        status.Split(' ')[0] == "Draw50" ||
                        status.Split(' ')[0] == "NoMaterial")
                    {
                        //присваиваем заключительный статус игре заместо Active
                        game.Status = status;
                        bool isDraw = false;
                        //случай ничьи
                        if (status.Split(' ')[0] != "Checkmate")
                            isDraw = true;
                        old_elo = (await _context.elos.Where(e => e.PlayerId == playerId && e.FormatId == game.FormatId)
                                .FirstOrDefaultAsync()).Number;
                        opponent_old_elo = (await _context.elos.Where(e => e.PlayerId == opponentId && e.FormatId == game.FormatId)
                            .FirstOrDefaultAsync()).Number;
                        int[] new_elos = await elo_handler.HandleElo(playerId, opponentId, game.FormatId, isDraw);
                        new_elo = new_elos[0];
                        opponent_new_elo = new_elos[1];
                        message = isDraw ? "Ничья" : "Вы поставили мат!";
                        opponent_message = isDraw ? "Ничья" : "Вам поставили мат!";
                        game_over = true;
                        await Clients.Client(Context.ConnectionId).SendAsync("MoveReceived", new
                        {
                            FEN = FEN,
                            Status = status,
                            GameOver = game_over,
                            GameOverData = new
                            {
                                message = message,
                                old_elo = old_elo,
                                new_elo = new_elo
                            }
                        });
                    }
                    else
                    {
                        //проверка на троекратное повторение
                        List<Move> same_pose = await _context.moves.Where(m => m.GameId == gameId).ToListAsync();
                        same_pose.RemoveAll(m => !logic_handler.FENEqual(m.FEN, FEN));
                        if (same_pose.Count >= 2)
                        {
                            game.Status = "DrawRepetition";
                            old_elo = (await _context.elos.Where(e => e.PlayerId == playerId && e.FormatId == game.FormatId)
                                .FirstOrDefaultAsync()).Number;
                            opponent_old_elo = (await _context.elos.Where(e => e.PlayerId == opponentId && e.FormatId == game.FormatId)
                                .FirstOrDefaultAsync()).Number;
                            int[] new_elos = await elo_handler.HandleElo(playerId, opponentId, game.FormatId, true);
                            new_elo = new_elos[0];
                            opponent_new_elo = new_elos[1];
                            message = "Ничья! Троекратное повторение позиции";
                            opponent_message = "Ничья! Троекратное повторение позиции";
                            game_over = true;
                            await Clients.Client(Context.ConnectionId).SendAsync("MoveReceived", new
                            {
                                FEN = FEN,
                                Status = status,
                                GameOver = game_over,
                                GameOverData = new
                                {
                                    message = message,
                                    old_elo = old_elo,
                                    new_elo = new_elo
                                }
                            });
                        }
                    }
                    _context.SaveChanges();
                    await Clients.Client(Context.ConnectionId).SendAsync("TimeCorrect", new
                    {
                        Time = (ending - new DateTime(1970, 1, 1, 3, 0, 0, 0)).TotalMilliseconds,
                        Own = true
                    });
                    await Clients.GroupExcept(gameId.ToString(), Context.ConnectionId).SendAsync("TimeCorrect", new
                    {
                        Time = (ending - new DateTime(1970,1, 1, 3,0,0,0)).TotalMilliseconds,
                        Own = false,
                        TimeAtPublish = (at_publish - new DateTime(1970, 1, 1, 3, 0, 0, 0)).TotalMilliseconds
                    });
                        await Clients.GroupExcept(gameId.ToString(), Context.ConnectionId).SendAsync("MoveReceived", new
                    {
                        FEN = FEN,
                        Status = status,
                        GameOver = game_over,
                        GameOverData = new
                        {
                            message = opponent_message,
                            old_elo = opponent_old_elo,
                            new_elo = opponent_new_elo
                        },
                        MoveNote = move_note
                    });
                }
                else
                {
                    ;
                }
            }
        }
        public async Task SendConcede(string gameId_s)
        {
            int gameId = Convert.ToInt32(gameId_s);
            var game = await _context.games.Where(g => g.Id == gameId).FirstOrDefaultAsync();
            int playerId = (await _context.players.
                Where(p => p.AccountId.ToString() == Context.UserIdentifier)
                .FirstOrDefaultAsync()).Id;
            int opponentId = game.WhitesId == playerId ? game.BlacksId : game.WhitesId;
            string color = game.WhitesId == playerId ? "Black" : "White";
            game.Status = $"Concede {color}";
            int old_elo = (await _context.elos.Where(e => e.PlayerId == playerId && e.FormatId == game.FormatId)
            .FirstOrDefaultAsync()).Number;
            int opponent_old_elo = (await _context.elos.Where(e => e.PlayerId == opponentId && e.FormatId == game.FormatId)
            .FirstOrDefaultAsync()).Number;
            int[] new_elos = await elo_handler.HandleElo(opponentId, playerId, game.FormatId, false);
            int new_elo = new_elos[1];
            int opponent_new_elo = new_elos[0];
            _context.SaveChanges();
            await Clients.Client(Context.ConnectionId).SendAsync("MoveReceived", new
            {
                FEN = "no_fen",
                Status = $"Concede {color}",
                GameOver = true,
                GameOverData = new
                {
                    message = "Вы сдались",
                    old_elo = old_elo,
                    new_elo = new_elo
                }
            });
            await Clients.GroupExcept(gameId.ToString(), Context.ConnectionId).SendAsync("MoveReceived", new
            {
                FEN = "no_fen",
                Status = $"Concede {color}",
                GameOver = true,
                GameOverData = new
                {
                    message = "Соперник сдался",
                    old_elo = opponent_old_elo,
                    new_elo = opponent_new_elo
                }
            });
        }
        public async Task AskForDraw(string gameId_s)
        {
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("DrawReceived");
        }
        public async Task AcceptDraw(string gameId_s)
        {
            int gameId = Convert.ToInt32(gameId_s);
            var game = await _context.games.Where(g => g.Id == gameId).FirstOrDefaultAsync();
            int playerId = (await _context.players.
                Where(p => p.AccountId.ToString() == Context.UserIdentifier)
                .FirstOrDefaultAsync()).Id;
            int opponentId = game.WhitesId == playerId ? game.BlacksId : game.WhitesId;
            string color = game.WhitesId == playerId ? "Black" : "White";
            game.Status = "Draw";
            int old_elo = (await _context.elos.Where(e => e.PlayerId == playerId && e.FormatId == game.FormatId)
            .FirstOrDefaultAsync()).Number;
            int opponent_old_elo = (await _context.elos.Where(e => e.PlayerId == opponentId && e.FormatId == game.FormatId)
            .FirstOrDefaultAsync()).Number;
            int[] new_elos = await elo_handler.HandleElo(opponentId, playerId, game.FormatId, true);
            int new_elo = new_elos[1];
            int opponent_new_elo = new_elos[0];
            _context.SaveChanges();
            await Clients.Client(Context.ConnectionId).SendAsync("MoveReceived", new
            {
                FEN = "no_fen",
                Status = "Draw",
                GameOver = true,
                GameOverData = new
                {
                    message = "Ничья по согласию",
                    old_elo = old_elo,
                    new_elo = new_elo
                }
            });
            await Clients.GroupExcept(gameId.ToString(), Context.ConnectionId).SendAsync("MoveReceived", new
            {
                FEN = "no_fen",
                Status = "Draw",
                GameOver = true,
                GameOverData = new
                {
                    message = "Ничья по согласию",
                    old_elo = opponent_old_elo,
                    new_elo = opponent_new_elo
                }
            });
        }
        public async Task DenyDraw(string gameId_s)
        {
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("DrawDenied");
        }
        public async Task AskForMoveBack(string gameId_s)
        {
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("MoveBackReceived");
        }
        public async Task AcceptMoveBack(string gameId_s, string sender_color)
        {
            int gameId = Convert.ToInt32(gameId_s);
            var moves = await _context.moves.Where(m => m.GameId == gameId).ToListAsync();
            var backing_move = moves[moves.Count - 2];
            _context.moves.Remove(moves[moves.Count - 1]);
            if (logic_handler.ColorFromFEN(backing_move.FEN) != sender_color)
            {
                backing_move = moves[moves.Count - 3];
                _context.moves.Remove(moves[moves.Count - 2]);
            }
            _context.SaveChanges();
            await Clients.Client(Context.ConnectionId).SendAsync("MoveReceived", new
            {
                FEN = backing_move.FEN,
                Status = "MoveBack",
                GameOver = false,
                GameOverData = new
                {
                    message = "",
                    old_elo = 0,
                    new_elo = 0
                }
            });
            await Clients.GroupExcept(gameId.ToString(), Context.ConnectionId).SendAsync("MoveReceived", new
            {
                FEN = backing_move.FEN,
                Status = "MoveBack",
                GameOver = false,
                GameOverData = new
                {
                    message = "",
                    old_elo = 0,
                    new_elo = 0
                }
            });
        }
        public async Task DenyMoveBack(string gameId_s)
        {
            await Clients.GroupExcept(gameId_s, Context.ConnectionId).SendAsync("MoveBackDenied");
        }
        public async Task SendTimesUp(string gameId_s)
        {
            int gameId = Convert.ToInt32(gameId_s);
            var game = await _context.games.Where(g => g.Id == gameId).FirstOrDefaultAsync();
            int playerId = (await _context.players.Where(p => p.AccountId.ToString() == Context.UserIdentifier).FirstOrDefaultAsync()).Id;
            int opponentId = game.WhitesId == playerId ? game.BlacksId : game.WhitesId;
            string color = game.WhitesId == playerId ? "Black" : "White";
            game.Status = $"TimesUp {color}";
            int old_elo = (await _context.elos.Where(e => e.PlayerId == playerId && e.FormatId == game.FormatId)
            .FirstOrDefaultAsync()).Number;
            int opponent_old_elo = (await _context.elos.Where(e => e.PlayerId == opponentId && e.FormatId == game.FormatId)
            .FirstOrDefaultAsync()).Number;
            int[] new_elos = await elo_handler.HandleElo(opponentId, playerId, game.FormatId, false);
            int new_elo = new_elos[1];
            int opponent_new_elo = new_elos[0];
            _context.SaveChanges();
            await Clients.Client(Context.ConnectionId).SendAsync("MoveReceived", new
            {
                FEN = "no_fen",
                Status = $"TimesUp {color}",
                GameOver = true,
                GameOverData = new
                {
                    message = "Вы проиграли по времени!",
                    old_elo = old_elo,
                    new_elo = new_elo
                }
            });
            await Clients.GroupExcept(gameId.ToString(), Context.ConnectionId).SendAsync("MoveReceived", new
            {
                FEN = "no_fen",
                Status = $"TimesUp {color}",
                GameOver = true,
                GameOverData = new
                {
                    message = "Вы победили по времени!",
                    old_elo = opponent_old_elo,
                    new_elo = opponent_new_elo
                }
            });
        }
        public override async Task OnConnectedAsync()
        {
            Console.WriteLine("Here it is!");
        }
        
    }
}
