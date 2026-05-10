using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Controllers.Servs;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers
{
    public class GameModel
    {
        public int GameId { get; set; }
        public int AccountId { get; set; }
    }
    class AboutMove 
    {
        public string FEN { get; set; }
        public int Time {  get; set; }
        public string Note { get; set; }
    }
    [ApiController]
    [Route("replay")]
    public class ReplayController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        private readonly ChessLogicHandler _handler = new ChessLogicHandler();
        public ReplayController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [HttpPost]
        [Route("played-game")]
        public IActionResult GetPlayedGame([FromBody] GameModel model)
        {
            Game game = _context.games.Where(g => g.Id == model.GameId).FirstOrDefault();
            string start = game.StartTime.Date.ToString().Split(' ')[0] + " " + 
                game.StartTime.TimeOfDay.ToString().Split(':')[0] + ":" + 
                game.StartTime.TimeOfDay.ToString().Split(':')[1];
            Player player = _context.players.Where(p => p.AccountId == model.AccountId).FirstOrDefault();
            bool isWhite = game.WhitesId == player.Id;
            Player opponent = _context.players.Where(p => p.Id == (isWhite ? game.BlacksId : game.WhitesId)).FirstOrDefault();
            Account opponent_account = _context.accounts.Where(a => a.Id == opponent.AccountId).FirstOrDefault();
            TimeFormat format = _context.timeFormats.Where(tf => tf.Id == game.FormatId).FirstOrDefault();
            List<AboutMove> about_moves = new List<AboutMove>();
            List<Move> moves = _context.moves.Where(m => m.GameId == model.GameId).ToList();
            for(int i =  0; i < moves.Count; i++) 
            {
                string fen_before;
                if (i == 0)
                    fen_before = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
                else fen_before = moves[i - 1].FEN;
                about_moves.Add(new AboutMove
                {
                    FEN = moves[i].FEN,
                    Time = Convert.ToInt32(moves[i].Time.TotalSeconds),
                    Note = _handler.CheckFEN(fen_before, moves[i].FEN)
                });
            }
            return Ok(new {start = start, isWhite = isWhite, opponentLogin = opponent_account.Login, formatName = format.Name, 
                defaultTime = Convert.ToInt32(format.Time.TotalSeconds), moves = about_moves });
        }
    }
}
