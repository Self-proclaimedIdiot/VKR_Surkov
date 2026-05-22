using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;
namespace ReactChess.Server.Controllers
{
    public class BanModel
    {
        public int ReportId { get; set; }
        public int AccountId { get; set; }
        public int AccusedId { get; set; }
        public int Term {  get; set; }
        public string Reason { get; set; }
    }
    public class DeclineModel
    {
        public int ReportId { get; set; }
    }
    class AboutReport 
    {
        public int Id { get; set; }
        public int ReporterId { get; set; }
        public string ReporterLogin { get; set; }
        public int AccusedId { get; set; }
        public string AccusedLogin { get; set; }
        public int GameId { get; set; }
        public string Text { get; set; }
    }
    [ApiController]
    [Route("reports")]
    public class ReportsController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        public ReportsController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [HttpGet]
        [Route("get-reports")]
        public IActionResult GetReports()
        {
            List<Report> reports = _context.reports.Take(50).ToList();
            List<AboutReport> aboutReports = new List<AboutReport>();
            foreach (Report report in reports)
            {
                aboutReports.Add(new AboutReport
                {
                    Id = report.Id,
                    ReporterLogin = _context.accounts.Where(a => a.Id == report.ReporterId).FirstOrDefault().Login,
                    AccusedId = report.AccusedId,
                    ReporterId = report.ReporterId,
                    AccusedLogin = _context.accounts.Where(a => a.Id == report.AccusedId).FirstOrDefault().Login,
                    GameId = report.GameId,
                    Text = report.Text
                });
            }
            return Ok(new {reports = aboutReports});
        }
        [HttpPost]
        [Route("ban-user")]
        [Authorize]
        public IActionResult BanUser([FromBody] BanModel model)
        {
            if (model.ReportId != 0)
            {
                Report report = _context.reports.Where(r => r.Id == model.ReportId).FirstOrDefault();
                _context.reports.Remove(report);
            }
            _context.bans.Add(new Ban
            {
                AccusedId = model.AccusedId,
                AdminId = model.AccountId,
                Term = new TimeSpan(model.Term,0,0,0),
                Start = DateTime.UtcNow,
                Reason = model.Reason
            });
            _context.SaveChanges();
            return Ok(new {correct = true});
        }
        [HttpPost]
        [Route("decline-report")]
        [Authorize]
        public IActionResult DeclineReport([FromBody] DeclineModel model)
        {
            Report report = _context.reports.Where(r => r.Id == model.ReportId).FirstOrDefault();
            _context.reports.Remove(report);
            _context.SaveChanges();
            return Ok(new {correct = true});
        }
    }
}
