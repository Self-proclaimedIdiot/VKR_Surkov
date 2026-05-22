using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers
{
    public class DeclineRequestModel
    {
        public int RequestId { get; set; }
    }
    public class GiveTitleModel
    {
        public int RequestId { get; set; }
        public int PetitionerId { get; set; }
        public string Title { get; set; }
    }
    class AboutRequest
    {
        public int Id { get; set; }
        public string PetitionerLogin { get; set; }
        public int PetitionerElo { get; set; }
        public int PetitionerId { get; set; }
        public string Title { get; set; }
        public string ValueTitle { get; set; }
        public string Info { get; set; }
    }
    [ApiController]
    [Route("requests")]
    public class RequestsController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        private readonly Dictionary<string, string> titles = new Dictionary<string, string>()
        {
            ["GM"] = "гроссмейстер",
            ["IM"] = "международный мастер",
            ["FM"] = "мастер ФИДЕ",
            ["CM"] = "кандидат в мастера"
        };
        public RequestsController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [HttpGet]
        [Route("get-requests")]
        public IActionResult GetRequests()
        {
            List<TitleRequest> requests = _context.titleRequests.Take(50).ToList();
            List<AboutRequest> aboutRequests = new List<AboutRequest>();
            foreach (TitleRequest request in requests)
            {
                Player player = _context.players.Where(p => p.AccountId == request.PetitionerId).FirstOrDefault();
                aboutRequests.Add(new AboutRequest
                {
                    Id = request.Id,
                    PetitionerLogin = _context.accounts.Where(a => a.Id == request.PetitionerId).FirstOrDefault().Login,
                    PetitionerId = request.PetitionerId,
                    PetitionerElo = _context.elos.Where(e => e.PlayerId == player.Id && e.FormatId == 1).FirstOrDefault().Number,
                    Title = titles[request.Title],
                    ValueTitle = request.Title,
                    Info = request.Info
                });
            }
            return Ok(new { requests = aboutRequests });
        }
        [HttpPost]
        [Route("give-title")]
        [Authorize]
        public IActionResult GiveTitle([FromBody] GiveTitleModel model)
        {
            TitleRequest request = _context.titleRequests.Where(tr => tr.Id == model.RequestId).FirstOrDefault();
            _context.titleRequests.Remove(request);
            Player player = _context.players.Where(p => p.AccountId == model.PetitionerId).FirstOrDefault();
            player.Title = model.Title;
            _context.SaveChanges();
            return Ok(new { correct = true });
        }
        [HttpPost]
        [Route("decline-request")]
        [Authorize]
        public IActionResult DeclineRequest([FromBody] DeclineRequestModel model)
        {
            TitleRequest request = _context.titleRequests.Where(tr => tr.Id == model.RequestId).FirstOrDefault();
            _context.titleRequests.Remove(request);
            _context.SaveChanges();
            return Ok(new { correct = true });
        }
    }
}
