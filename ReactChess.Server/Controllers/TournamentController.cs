using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers
{
    public class CreateTournamentModel
    {
        public string Name { get; set; }
        public int PassElo { get; set; }
        public string PassTitle { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
    }

    public class UpdateTournamentModel
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int PassElo { get; set; }
        public string PassTitle { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
    }

    public class DeleteTournamentModel
    {
        public int Id { get; set; }
    }

    [ApiController]
    [Route("tournaments")]
    public class TournamentController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());

        public TournamentController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        [Route("get-all")]
        public IActionResult GetAll()
        {
            var tournaments = _context.tournaments
                .OrderBy(t => t.StartTime)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.PassElo,
                    t.PassTitle,
                    t.StartTime,
                    t.EndTime
                })
                .ToList();

            return Ok(new { tournaments });
        }

        [HttpPost]
        [Route("create")]
        [Authorize]
        public IActionResult Create([FromBody] CreateTournamentModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Name))
                return BadRequest(new { error = "Название турнира обязательно" });

            if (model.EndTime <= model.StartTime)
                return BadRequest(new { error = "Дата окончания должна быть позже даты начала" });

            var tournament = new Tournament
            {
                Name = model.Name,
                PassElo = model.PassElo,
                PassTitle = model.PassTitle ?? "",
                StartTime = model.StartTime,
                EndTime = model.EndTime
            };

            _context.tournaments.Add(tournament);
            _context.SaveChanges();

            return Ok(new { correct = true, id = tournament.Id });
        }

        [HttpPost]
        [Route("update")]
        [Authorize]
        public IActionResult Update([FromBody] UpdateTournamentModel model)
        {
            var tournament = _context.tournaments.FirstOrDefault(t => t.Id == model.Id);
            if (tournament == null)
                return NotFound(new { error = "Турнир не найден" });

            if (string.IsNullOrWhiteSpace(model.Name))
                return BadRequest(new { error = "Название турнира обязательно" });

            if (model.EndTime <= model.StartTime)
                return BadRequest(new { error = "Дата окончания должна быть позже даты начала" });

            tournament.Name = model.Name;
            tournament.PassElo = model.PassElo;
            tournament.PassTitle = model.PassTitle ?? "";
            tournament.StartTime = model.StartTime;
            tournament.EndTime = model.EndTime;

            _context.SaveChanges();

            return Ok(new { correct = true });
        }

        [HttpPost]
        [Route("delete")]
        [Authorize]
        public IActionResult Delete([FromBody] DeleteTournamentModel model)
        {
            var tournament = _context.tournaments.FirstOrDefault(t => t.Id == model.Id);
            if (tournament == null)
                return NotFound(new { error = "Турнир не найден" });

            _context.tournaments.Remove(tournament);
            _context.SaveChanges();

            return Ok(new { correct = true });
        }
    }
}
