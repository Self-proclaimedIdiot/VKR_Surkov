using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers
{
    public class UserSearchModel
    {
        public string Login { get; set; }
    }
    [ApiController]
    [Route("user-search")]
    public class UserSearchController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        public UserSearchController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [HttpPost]
        [Route("load-users")]
        public IActionResult LoadUsers([FromBody] UserSearchModel model)
        {
            List<Account> users = _context.accounts.Where(a => a.Login.ToLower().Contains(model.Login.ToLower())).ToList();
            List<Account> res_users = new List<Account>();
            for(int i = 0;i < (users.Count > 4 ? 4 : users.Count); i++)
            {
                res_users.Add(users[i]);
            }
            return Ok(new {users = res_users});
        }
    }
}
