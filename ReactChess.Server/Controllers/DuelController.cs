using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;
namespace ReactChess.Server.Controllers
{
    public class DuelModel
    {
        public int AccountId { get; set; }
        public int FormatId { get; set; }
        public int GameId { get; set; }
    }
    [ApiController]
    [Route("duel")]
    public class DuelController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        public DuelController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [Authorize]
        [HttpPost]
        [Route("get-format-time")]
        public IActionResult GetFormatTime([FromBody] DuelModel model)
        {
            TimeFormat format = _context.timeFormats.Where(tf => tf.Id == model.FormatId).FirstOrDefault();
            Player player = _context.players.Where(p => p.AccountId == model.AccountId).FirstOrDefault();
            Game game = _context.games.Where(g => g.Id == model.GameId).FirstOrDefault();
            bool isWhite = game.WhitesId == player.Id;
            return Ok(new
            {
                baseTime = Convert.ToInt32(format.Time.TotalSeconds),
                addTime = Convert.ToInt32(format.AddTime.TotalSeconds),
                isWhite = isWhite
            });
        }
    }
}
