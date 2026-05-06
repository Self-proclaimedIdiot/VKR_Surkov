using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers
{
    public class UserProfileModel
    {
        public int AccountId { get; set; }
    }
    class FormatNameAndEloNumber
    {
        public string FormatName { get; set; }
        public int EloNumber { get; set;}
    }
    class AboutGame
    {
        public int Id { get; set; }
        public int OpponentId { get; set; }
        public string OpponentLogin { get; set; }
        public int OpponentElo { get; set; }
        public string FormatName { get; set; }
        public string Result { get; set; }
        public bool isVictory { get; set; }
    }
    [ApiController]
    [Route("user-profile")]
    public class UserProfileController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        public UserProfileController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [Authorize]
        [HttpPost]
        [Route("load-user-data")]
        public IActionResult GetUserData([FromBody] UserProfileModel model)
        {
            Account account = _context.accounts.Where(a => a.Id == model.AccountId).FirstOrDefault();
            Player player = _context.players.Where(p => p.AccountId == model.AccountId).FirstOrDefault();
            List<Game> games = _context.games.Where(g => g.BlacksId == player.Id || g.WhitesId == player.Id).ToList();
            string login = account.Login;
            string title = player.Title;
            bool isPlaying = false;
            List<AboutGame> about_games = new List<AboutGame>();
            foreach(Game g in games)
            {
                bool isWhite = g.WhitesId == player.Id;
                Player opponent = _context.players.Where(p => p.Id == (isWhite? g.BlacksId : g.WhitesId)).FirstOrDefault();
                Account opponent_account = _context.accounts.Where(a => a.Id == opponent.AccountId).FirstOrDefault();
                Elo opponent_elo = _context.elos.Where(e => e.PlayerId == opponent.Id && e.FormatId == g.FormatId).FirstOrDefault();
                TimeFormat format = _context.timeFormats.Where(tf => tf.Id == g.FormatId).FirstOrDefault();
                string[] status_splitted = g.Status.Split(' ');
                string result = status_splitted[0];
                bool isVictory = status_splitted[1] == (isWhite ? "White" : "Black");
                about_games.Add(new AboutGame
                {
                    Id = g.Id,
                    OpponentId = opponent_account.Id,
                    OpponentLogin = opponent_account.Login,
                    OpponentElo = opponent_elo.Number,
                    FormatName = format.Name,
                    Result = result,
                    isVictory = isVictory
                });
                if(g.Status == "Active")
                    isPlaying = true;
            }
            List<Elo> elos = _context.elos.Where(e => e.PlayerId == player.Id).ToList();
            List<FormatNameAndEloNumber> names_and_nums = new List<FormatNameAndEloNumber>();
            foreach (Elo e in elos)
            {
                string format_name = _context.timeFormats.Where(tf => tf.Id == e.FormatId).FirstOrDefault()?.Name;
                names_and_nums.Add(new FormatNameAndEloNumber
                {
                    FormatName = format_name,
                    EloNumber = e.Number
                });
            }
            return Ok(new { login = login, title = title, isPlaying = isPlaying, elos = names_and_nums, games = about_games });
        }
    }
}
