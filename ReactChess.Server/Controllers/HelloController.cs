using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers
{
    public class User
    {
        public string Name { get; set; }
    }
    [ApiController]
    [Route("[controller]")]
    public class HelloController : ControllerBase
    {
        private readonly ILogger<HelloController> _logger;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());

        public HelloController(ILogger<HelloController> logger)
        {
            _logger = logger;
        }
        [HttpGet]
        [Route("suka")]
        public IActionResult Get()
        {
            //return Ok(new IWantToDie { Message = "Hello from ASP.NET!" });
            return Ok(new { message = "Hello from JSON, suka!" });
        }
        [HttpPost]
        [Route("send-name")]
        public IActionResult PostName([FromBody] User data) // [FromBody] говорит взять данные из тела запроса
        {
            //_logger.LogInformation($"Получено имя: {data.Name}");
            return Ok(new { message = $"Привет, {data.Name}! Данные успешно получены на сервере." });
        }
    }
}
