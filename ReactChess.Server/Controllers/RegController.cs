using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;
using static System.Runtime.InteropServices.JavaScript.JSType;
using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
namespace ReactChess.Server.Controllers
{
    public enum Level {newbie, amateur, advanced, expert}
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
            //return Ok(new IWantToDie { Message = "Hello from ASP.NET!" });
            //return Json(new { message = "Hello from Register, suka!" });
            return Ok(new {message = "СЕКРЕТНАЯ ИНФОРМАЦИЯ" });
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
