using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;
using static System.Runtime.InteropServices.JavaScript.JSType;
using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
namespace ReactChess.Server.Controllers
{
    public enum Level {newbie, amateur, advanced, expert}
    public class CheckBanModel
    {
        public int AccountId { get; set; }
    }
    public class RegisterModel
    {
        public string Email { get; set; }
        public string Login { get; set; }
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
        public Level Level { get; set; }
    }
    [ApiController]
    [Route("reg")]
    public class RegController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        public RegController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [Authorize]
        [HttpGet]
        [Route("suka")]
        public IActionResult Get()
        {
            
            return Ok(new {message = "СЕКРЕТНАЯ ИНФОРМАЦИЯ" });
        }
        [Authorize]
        [HttpPost]
        [Route("check-ban")]
        public IActionResult CheckBan([FromBody] CheckBanModel data)
        {
            Ban ban = _context.bans.Where(b => b.AccusedId == data.AccountId && DateTime.UtcNow < b.Start + b.Term).FirstOrDefault();
            bool isBanned = ban != null;
            int unban = 0;
            string ban_reason = "";
            if (isBanned)
            {
                unban = Convert.ToInt32((ban.Start + ban.Term - new DateTime(1970, 1, 1, 3, 0, 0, 0)).TotalSeconds);
                ban_reason = ban.Reason;
            }
            return Ok(new {isBanned = isBanned, unban = unban, banReason = ban_reason});
        }
        [HttpPost]
        [Route("send")]
        public IActionResult PostAccount([FromBody] RegisterModel data) 
        {
            string feedback = "";
            bool sameEmail = _context.accounts.Where(a => a.Email == data.Email).FirstOrDefault() != null;
            bool sameLogin = _context.accounts.Where(a => a.Login == data.Login).FirstOrDefault() != null;
            if (sameEmail)
                feedback = "Email занят";
            else if (sameLogin)
                feedback = "Логин занят";
            else
            {
                Account account = new Account()
                {
                    Email = data.Email,
                    Login = data.Login,
                    Password = BCrypt.Net.BCrypt.HashPassword(data.Password, 12),
                    IsAdmin = false
                };
                _context.accounts.Add(account);
                _context.SaveChanges();
                Player player = new Player() { AccountId = account.Id };
                _context.players.Add(player);
                _context.SaveChanges();
                int elo = 0;
                switch (data.Level)
                {
                    case Level.newbie:
                        elo = 1000;
                        break;
                    case Level.amateur:
                        elo = 1400;
                        break;
                    case Level.advanced:
                        elo = 1600;
                        break;
                    case Level.expert:
                        elo = 1800;
                        break;
                }
                foreach (TimeFormat format in _context.timeFormats)
                {
                    _context.elos.Add(new Elo()
                    {
                        PlayerId = player.Id,
                        FormatId = format.Id,
                        Number = elo
                    });
                }
                _context.SaveChanges();
                feedback = "Чувак удачно создан!";
            }
            return Ok(new {feedback = feedback});
        }
    }
}
