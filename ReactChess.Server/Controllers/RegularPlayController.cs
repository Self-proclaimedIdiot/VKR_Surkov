using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;
using Microsoft.AspNetCore.Authorization;

namespace ReactChess.Server.Controllers
{
    class TimeFormatWithSecondsOnly
    {
        public int Id { get; set; }

        public string Name { get; set; }

        public int Time { get; set; }
        public int AddTime { get; set; }
    }
    [ApiController]
    [Route("regplay")]
    public class RegularPlayController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        public RegularPlayController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [Authorize]
        [HttpGet]
        [Route("load-formats")]
        public IActionResult Get()
        {
            List<TimeFormat> formats = _context.timeFormats.ToList();
            List<TimeFormatWithSecondsOnly> seconds_only = new List<TimeFormatWithSecondsOnly>();
            foreach (var format in formats)
            {
                seconds_only.Add(new TimeFormatWithSecondsOnly
                {
                    Id = format.Id,
                    Name = format.Name,
                    Time = Convert.ToInt32(format.Time.TotalSeconds),
                    AddTime = Convert.ToInt32(format.AddTime.TotalSeconds)
                });
            }
            return Ok(seconds_only);
        }
    }
}
