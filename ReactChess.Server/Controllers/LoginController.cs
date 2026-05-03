using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Controllers.Servs;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers
{
    public class LoginModel
    {
        public string LoginOrEmail { get; set; }
        public string Password { get; set; }
    }
    [ApiController]
    [Route("login")]
    public class LoginController:ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        public LoginController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [HttpPost]
        [Route("send")]
        public IActionResult CheckAccount([FromBody] LoginModel data)
        {
            string feedback = "";
            string token = "";
            Account account = _context.accounts.Where(a => a.Email == data.LoginOrEmail).FirstOrDefault();
            if (account == null)
                account = _context.accounts.Where(a => a.Login == data.LoginOrEmail).FirstOrDefault();
            if (account != null)
            {
                if (BCrypt.Net.BCrypt.Verify(data.Password, account.Password))
                {
                    feedback = "Заходи, родной";
                    JWTGenerator generator = new JWTGenerator(_configuration);
                    token = generator.Generate(account);
                }
                else
                    feedback = "Неверный пароль";
            }
            else feedback = "Кто?";
            return (Ok(new {feedback = feedback, token = token}));
        }
    }
}
