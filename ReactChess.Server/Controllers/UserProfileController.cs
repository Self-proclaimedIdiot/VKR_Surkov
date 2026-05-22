using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace ReactChess.Server.Controllers
{
    public class UserProfileModel
    {
        public int ClientId { get; set; }
        public int AccountId { get; set; }
    }
    public class TitleModel
    {
        public int AccountId { get; set; }
        public string Title { get; set; }
    }
    public class UnbanModel
    {
        public int AccusedId { get; set; }
    }
    public class ProfileUpdateModel
    {
        public int AccountId { get; set; }
        public string Login { get; set; }
        public string Email { get; set; }
    }
    public class PasswordUpdateModel
    {
        public int AccountId { get; set; }
        public string OldPassword { get; set; }
        public string NewPassword { get; set; }
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
        public string Description { get; set; }
        public string Result { get; set; }
    }
    public class ReportModel
    {
        public int ReporterId { get; set; }
        public int AccusedId { get; set; }
        public string Text { get; set; }
    }
    public class RequestModel
    {
        public int PetitionerId { get; set; }
        public string Title { get; set; }
        public string Info { get; set; }
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
            string email = account.Email;
            bool isPlaying = false;
            bool isSubscribed = model.ClientId != model.AccountId &&
                _context.friendships.Where(f => f.SenderId == model.ClientId && f.RecipientId == model.AccountId).Any();
            bool isSubscriber = model.ClientId != model.AccountId &&
                _context.friendships.Where(f => f.RecipientId == model.ClientId && f.SenderId == model.AccountId).Any();
            List<AboutGame> about_games = new List<AboutGame>();
            foreach(Game g in games)
            {
                bool isWhite = g.WhitesId == player.Id;
                Player opponent = _context.players.Where(p => p.Id == (isWhite? g.BlacksId : g.WhitesId)).FirstOrDefault();
                Account opponent_account = _context.accounts.Where(a => a.Id == opponent.AccountId).FirstOrDefault();
                Elo opponent_elo = _context.elos.Where(e => e.PlayerId == opponent.Id && e.FormatId == g.FormatId).FirstOrDefault();
                TimeFormat format = _context.timeFormats.Where(tf => tf.Id == g.FormatId).FirstOrDefault();
                string[] status_splitted = g.Status.Split(' ');
                string result = "";
                string description = status_splitted[0];
                if(status_splitted.Length == 1)
                {
                    if (status_splitted[0] == "Active")
                        result = "В процессе";
                    else result = "Ничья";
                }
                else
                {
                    result = (isWhite && status_splitted[1] == "White" || !isWhite && status_splitted[1] == "Black") ?
                        "Победа" : "Поражение";
                }
                about_games.Add(new AboutGame
                {
                    Id = g.Id,
                    OpponentId = opponent_account.Id,
                    OpponentLogin = opponent_account.Login,
                    OpponentElo = opponent_elo.Number,
                    FormatName = format.Name,
                    Description = description,
                    Result = result,
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
            List<TimeFormat> formats = _context.timeFormats.ToList();
            bool isBanned = _context.bans.Where(b => b.AccusedId == model.AccountId && b.Start + b.Term > DateTime.UtcNow).Any();
            return Ok(new { login = login, title = title, email = email, isPlaying = isPlaying, elos = names_and_nums, games = about_games,
            isSubscribed = isSubscribed, isSubscriber = isSubscriber, isBanned = isBanned, formats = formats});
        }
        [Authorize]
        [HttpPost]
        [Route("post-user-data")]
        public IActionResult PostUserData([FromBody] ProfileUpdateModel model)
        {
            bool isCorrect = false;
            List<string> problems = new List<string>();
            if (_context.accounts.Where(a => a.Id != model.AccountId && a.Login == model.Login).Any())
                problems.Add("Логин занят!");
            if (_context.accounts.Where(a => a.Id != model.AccountId && a.Email == model.Email).Any())
                problems.Add("Email занят!");
            if(problems.Count == 0)
            {
                Account account = _context.accounts.Where(a => a.Id == model.AccountId).FirstOrDefault();
                account.Login = model.Login;
                account.Email = model.Email;
                _context.SaveChanges();
                problems.Add("Данные успешно изменены!");
                isCorrect = true;
            }
            return Ok(new { problems = problems, isCorrect = isCorrect });
        }
        [Authorize]
        [Route("post-user-password")]
        [HttpPost]
        public IActionResult PostUserPassword([FromBody] PasswordUpdateModel model)
        {
            bool isCorrect = false;
            List<string> problems = new List<string>();
            Account account = _context.accounts.Where(a => a.Id == model.AccountId).FirstOrDefault();
            if (BCrypt.Net.BCrypt.Verify(model.OldPassword, account.Password))
            {
                account.Password = BCrypt.Net.BCrypt.HashPassword(model.NewPassword,12);
                _context.SaveChanges();
                problems.Add("Пароль успешно изменен!");
                isCorrect = true;
            }
            else problems.Add("Неверный пароль!");
            return Ok(new { problems = problems, isCorrect = isCorrect });
        }
        [Authorize]
        [Route("post-report")]
        [HttpPost]
        public IActionResult PostReport([FromBody] ReportModel model)
        {
            _context.reports.Add(new Report
            {
                ReporterId = model.ReporterId,
                AccusedId = model.AccusedId,
                Text = model.Text
            });
            _context.SaveChanges();
            return Ok(new {correct = true});
        }
        [Authorize]
        [Route("post-request")]
        [HttpPost]
        public IActionResult PostRequest([FromBody] RequestModel model)
        {
            _context.titleRequests.Add(new TitleRequest {
                PetitionerId = model.PetitionerId,
                Title = model.Title,
                Info = model.Info
            });
            _context.SaveChanges();
            return Ok(new { correct = true });
        }
        [Authorize]
        [Route("unban-user")]
        [HttpPost]
        public IActionResult UnbanUser([FromBody] UnbanModel model)
        {
            foreach(Ban ban in _context.bans.Where(b => b.AccusedId == model.AccusedId && b.Start + b.Term > DateTime.UtcNow))
            {
                ban.Term = DateTime.UtcNow - ban.Start;
            }
            _context.SaveChanges();
            return Ok(new { correct = true });
        }
        [Authorize]
        [Route("post-title")]
        [HttpPost]
        public IActionResult PostTitle([FromBody] TitleModel model)
        {
            Player player = _context.players.Where(p => p.AccountId == model.AccountId).FirstOrDefault();
            player.Title = model.Title == "" ? null : model.Title;
            _context.SaveChanges();
            return Ok(new { correct = true });
        }
    }
}
