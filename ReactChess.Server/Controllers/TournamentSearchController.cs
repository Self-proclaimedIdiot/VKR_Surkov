using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;
using System.Security.Claims;

namespace ReactChess.Server.Controllers
{
    public class RegisterTournamentModel
    {
        public int TournamentId { get; set; }
    }

    public class UnregisterTournamentModel
    {
        public int TournamentId { get; set; }
    }

    [ApiController]
    [Route("tournament")]
    public class TournamentSearchController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());

        public TournamentSearchController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        private string ConvertDescription(string description)
        {
            switch (description)
            {
                case "Draw":
                    return "Ничья по согласию";
                case "Stalemate":
                    return "Пат";
                case "Draw50":
                    return "Правило 50 ходов";
                case "NoMaterial":
                    return "Нехватка материала";
                case "Checkmate":
                    return "Мат";
                case "Concede":
                    return "Сдача";
                case "PlayerLeft":
                    return "Игрок вышел";
                case "TimesUp":
                    return "Время вышло";
                default:
                    return description;
            }
        }
        // ────────────────────────────────────────────────────
        // GET /tournament/search?name=...
        // Список всех турниров с флагом регистрации текущего пользователя
        // ────────────────────────────────────────────────────
        [HttpGet]
        [Route("search")]
        [Authorize]
        public IActionResult Search([FromQuery] string name = "")
        {
            int accountId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var query = _context.tournaments.AsQueryable();

            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(t => t.Name.ToLower().Contains(name.ToLower()));

            var tournaments = query
                .OrderBy(t => t.StartTime)
                .ToList();

            // Собираем все регистрации пользователя одним запросом
            var registeredIds = _context.tournamentParticipants
                .Where(p => p.AccountId == accountId)
                .Select(p => p.TournamentId)
                .ToHashSet();

            // ELO пользователя (берём первый формат как «основной» рейтинг)
            var player = _context.players.FirstOrDefault(p => p.AccountId == accountId);
            int userElo = 0;
            string userTitle = "";
            if (player != null)
            {
                var elo = _context.elos.FirstOrDefault(e => e.PlayerId == player.Id && e.FormatId == 1);
                userElo = elo?.Number ?? 0;
                userTitle = player.Title ?? "";
            }

            var result = tournaments.Select(t =>
            {
                int participantCount = _context.tournamentParticipants.Count(p => p.TournamentId == t.Id);
                bool isRegistered = registeredIds.Contains(t.Id);
                bool canRegister = userElo >= t.PassElo &&
                                   (string.IsNullOrEmpty(t.PassTitle) || userTitle == t.PassTitle);
                string status = GetStatus(t);

                return new
                {
                    t.Id,
                    t.Name,
                    t.PassElo,
                    t.PassTitle,
                    t.StartTime,
                    t.EndTime,
                    isRegistered,
                    canRegister,
                    participantCount,
                    status
                };
            }).ToList();

            return Ok(new { tournaments = result });
        }

        // ────────────────────────────────────────────────────
        // GET /tournament/{id}
        // Подробная страница турнира
        // ────────────────────────────────────────────────────
        [HttpGet]
        [Route("{id:int}")]
        [Authorize]
        public IActionResult GetTournament(int id)
        {
            int accountId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var tournament = _context.tournaments.FirstOrDefault(t => t.Id == id);
            if (tournament == null)
                return NotFound(new { error = "Турнир не найден" });

            // Участники
            var participantRows = _context.tournamentParticipants
                .Where(p => p.TournamentId == id)
                .ToList();

            var participants = participantRows.Select(p =>
            {
                var acc = _context.accounts.FirstOrDefault(a => a.Id == p.AccountId);
                var pl = _context.players.FirstOrDefault(pl => pl.AccountId == p.AccountId);
                int elo = 0;
                if (pl != null)
                {
                    var eloRow = _context.elos.FirstOrDefault(e => e.PlayerId == pl.Id && e.FormatId == 1);
                    elo = eloRow?.Number ?? 0;
                }
                return new
                {
                    accountId = p.AccountId,
                    login = acc?.Login ?? "—",
                    title = pl?.Title,
                    elo
                };
            })
            .OrderByDescending(p => p.elo)
            .ToList();

            // Партии турнира
            var games = _context.games
                .Where(g => g.TournamentId == id)
                .ToList();

            var gameRows = games.Select(g =>
            {
                var whites = _context.accounts.FirstOrDefault(a =>
                    _context.players.Any(p => p.Id == g.WhitesId && p.AccountId == a.Id));
                var blacks = _context.accounts.FirstOrDefault(a =>
                    _context.players.Any(p => p.Id == g.BlacksId && p.AccountId == a.Id));
                var format = _context.timeFormats.FirstOrDefault(f => f.Id == g.FormatId);

                return new
                {
                    g.Id,
                    status = ConvertDescription(g.Status.Split(' ')[0]),
                    result = g.Status.Split(' ').Length > 1 ? g.Status.Split(' ')[1] : "Draw",
                    whitesLogin = whites?.Login ?? "—",
                    blacksLogin = blacks?.Login ?? "—",
                    whitesId = whites?.Id,
                    formatName = format?.Name ?? "—",
                    g.StartTime
                };
            })
            .OrderByDescending(g => g.StartTime)
            .ToList();

            bool isRegistered = _context.tournamentParticipants
                .Any(p => p.TournamentId == id && p.AccountId == accountId);

            // Проверяем право на регистрацию
            var myPlayer = _context.players.FirstOrDefault(p => p.AccountId == accountId);
            int myElo = 0;
            string myTitle = "";
            if (myPlayer != null)
            {
                var eloRow = _context.elos.FirstOrDefault(e => e.PlayerId == myPlayer.Id && e.FormatId == 1);
                myElo = eloRow?.Number ?? 0;
                myTitle = myPlayer.Title ?? "";
            }
            bool canRegister = myElo >= tournament.PassElo &&
                               (string.IsNullOrEmpty(tournament.PassTitle) || myTitle == tournament.PassTitle);

            return Ok(new
            {
                tournament = new
                {
                    tournament.Id,
                    tournament.Name,
                    tournament.PassElo,
                    tournament.PassTitle,
                    tournament.StartTime,
                    tournament.EndTime,
                    status = GetStatus(tournament),
                    participantCount = participantRows.Count
                },
                participants,
                games = gameRows,
                isRegistered,
                canRegister
            });
        }

        // ────────────────────────────────────────────────────
        // GET /tournament/{id}/leaderboard
        // Таблица лидеров арены для турнира
        // ────────────────────────────────────────────────────
        [HttpGet]
        [Route("{id:int}/leaderboard")]
        [Authorize]
        public IActionResult GetLeaderboard(int id)
        {
            var tournament = _context.tournaments.FirstOrDefault(t => t.Id == id);
            if (tournament == null)
                return NotFound(new { error = "Турнир не найден" });

            var scores = _context.tournamentArenaScores
                .Where(s => s.TournamentId == id)
                .ToList();

            var leaderboard = scores.Select(s =>
            {
                var acc = _context.accounts.FirstOrDefault(a => a.Id == s.AccountId);
                var pl  = _context.players.FirstOrDefault(p => p.AccountId == s.AccountId);
                return new
                {
                    accountId = s.AccountId,
                    login     = acc?.Login ?? "—",
                    title     = pl?.Title,
                    wins      = s.Wins,
                    draws     = s.Draws,
                    losses    = s.Losses,
                    points    = s.Wins * 2 + s.Draws
                };
            })
            .OrderByDescending(s => s.points)
            .ThenByDescending(s => s.wins)
            .ToList();

            return Ok(new
            {
                tournament = new
                {
                    tournament.Id,
                    tournament.Name,
                    tournament.StartTime,
                    tournament.EndTime,
                    status = GetStatus(tournament)
                },
                leaderboard
            });
        }

        // ────────────────────────────────────────────────────
        // POST /tournament/register
        // ────────────────────────────────────────────────────
        [HttpPost]
        [Route("register")]
        [Authorize]
        public IActionResult Register([FromBody] RegisterTournamentModel model)
        {
            int accountId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var tournament = _context.tournaments.FirstOrDefault(t => t.Id == model.TournamentId);
            if (tournament == null)
                return NotFound(new { error = "Турнир не найден" });

            if (tournament.StartTime <= DateTime.UtcNow)
                return BadRequest(new { error = "Регистрация на турнир уже закрыта" });

            bool alreadyRegistered = _context.tournamentParticipants
                .Any(p => p.TournamentId == model.TournamentId && p.AccountId == accountId);
            if (alreadyRegistered)
                return BadRequest(new { error = "Вы уже зарегистрированы" });

            // Проверка требований
            var player = _context.players.FirstOrDefault(p => p.AccountId == accountId);
            int elo = 0;
            string title = "";
            if (player != null)
            {
                var eloRow = _context.elos.FirstOrDefault(e => e.PlayerId == player.Id && e.FormatId == 1);
                elo = eloRow?.Number ?? 0;
                title = player.Title ?? "";
            }

            if (elo < tournament.PassElo)
                return BadRequest(new { error = $"Недостаточный рейтинг. Требуется: {tournament.PassElo}, у вас: {elo}" });

            if (!string.IsNullOrEmpty(tournament.PassTitle) && title != tournament.PassTitle)
                return BadRequest(new { error = $"Требуется титул: {tournament.PassTitle}" });

            _context.tournamentParticipants.Add(new TournamentParticipant
            {
                TournamentId = model.TournamentId,
                AccountId = accountId
            });
            _context.SaveChanges();

            return Ok(new { correct = true });
        }

        // ────────────────────────────────────────────────────
        // POST /tournament/unregister
        // ────────────────────────────────────────────────────
        [HttpPost]
        [Route("unregister")]
        [Authorize]
        public IActionResult Unregister([FromBody] UnregisterTournamentModel model)
        {
            int accountId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var tournament = _context.tournaments.FirstOrDefault(t => t.Id == model.TournamentId);
            if (tournament == null)
                return NotFound(new { error = "Турнир не найден" });

            if (tournament.StartTime <= DateTime.UtcNow)
                return BadRequest(new { error = "Отменить регистрацию после начала турнира нельзя" });

            var participant = _context.tournamentParticipants
                .FirstOrDefault(p => p.TournamentId == model.TournamentId && p.AccountId == accountId);

            if (participant == null)
                return BadRequest(new { error = "Вы не зарегистрированы на этот турнир" });

            _context.tournamentParticipants.Remove(participant);
            _context.SaveChanges();

            return Ok(new { correct = true });
        }

        // ────────────────────────────────────────────────────
        // Хелпер: статус турнира
        // ────────────────────────────────────────────────────
        private static string GetStatus(Tournament t)
        {
            var now = DateTime.UtcNow;
            if (now < t.StartTime) return "upcoming";
            if (now <= t.EndTime) return "ongoing";
            return "finished";
        }
    }
}
