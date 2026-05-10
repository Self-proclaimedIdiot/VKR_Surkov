using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;
namespace ReactChess.Server.Controllers
{
    public class PlayersDataModel
    {
        public bool IsWhite {  get; set; }
        public int GameId { get; set; }
    }
    [ApiController]
    [Route("game")]
    public class GameController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        public GameController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [HttpPost]
        [Route("load-players-data")]
        public IActionResult GetLoginAndElo([FromBody] PlayersDataModel data)
        {
            Game game = _context.games.Where(g => g.Id == data.GameId).FirstOrDefault();
            int PlayerId = data.IsWhite ? game.WhitesId : game.BlacksId;
            Player player = _context.players.Where(p => p.Id == PlayerId).FirstOrDefault();
            Account account = _context.accounts.Where(a => a.Id == player.AccountId).FirstOrDefault();
            string login = account?.Login;
            string title = player.Title;
            Elo elo = _context.elos.Where(e => e.PlayerId == PlayerId && e.FormatId == game.FormatId).FirstOrDefault();
            int number = elo.Number;
            int OpponentId = data.IsWhite ? game.BlacksId : game.WhitesId;
            Player opponent = _context.players.Where(p => p.Id == OpponentId).FirstOrDefault();
            Account opponent_account = _context.accounts.Where(a => a.Id == opponent.AccountId).FirstOrDefault();
            string opponent_login = opponent_account?.Login;
            string opponent_title = opponent.Title;
            Elo opponent_elo = _context.elos.Where(e => e.PlayerId == OpponentId && e.FormatId == game.FormatId).FirstOrDefault();
            int opponent_number = opponent_elo.Number;
            int opponent_account_id = opponent_account.Id;
            bool isFriend = _context.friendships.Where(f => f.SenderId == account.Id && f.RecipientId == opponent_account_id).Any() &&
                _context.friendships.Where(f => f.RecipientId == account.Id && f.SenderId == opponent_account_id).Any();
            return Ok(new {login = login, elo = number, title = title, 
                opponentLogin = opponent_login, opponentElo = opponent_number, opponentTitle = opponent_title, 
                opponentId = opponent_account_id, isFriend = isFriend
            });
        }
    }
}
