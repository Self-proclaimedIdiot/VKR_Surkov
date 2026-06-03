using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers
{
    class AboutFriend
    {
        public int AccountId { get; set; }
        public string Login { get; set; }
        public bool isSubscribed { get; set; }
        public bool isSubscriber { get; set; }
    }
    class AboutSubscriber
    {
        public int AccountId { get; set;}
        public string Login { get; set;}
    }
    [ApiController]
    [Route("friends")]
    public class FriendsController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        public FriendsController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [Authorize]
        [HttpPost]
        [Route("get-friends")]
        public IActionResult GetFriends([FromBody] UserProfileModel model)
        {
            List<Account> friends = _context.accounts.Where(a =>
            _context.friendships.Where(f => f.SenderId == model.AccountId && f.RecipientId == a.Id).Any() &&
            _context.friendships.Where(f => f.RecipientId == model.AccountId && f.SenderId == a.Id).Any()).ToList();
            List<AboutFriend> about_friends = new List<AboutFriend>();
            foreach (var friend in friends)
            {
                bool isSubscribed = false;
                bool isSubscriber = false;
                if (model.ClientId == model.AccountId)
                {
                    isSubscribed = true;
                    isSubscriber = true;
                }
                else
                {
                    isSubscribed = _context.friendships.Where(f => f.SenderId == model.ClientId && f.RecipientId == friend.Id).Any();
                    isSubscriber = _context.friendships.Where(f => f.RecipientId == model.ClientId && f.SenderId == friend.Id).Any();
                }
                about_friends.Add(new AboutFriend
                {
                    AccountId = friend.Id,
                    Login = friend.Login,
                    isSubscribed = isSubscribed,
                    isSubscriber = isSubscriber
                });
            }
            List<TimeFormat> formats = _context.timeFormats.ToList();
            string login = _context.accounts.Where(a => a.Id == model.AccountId).FirstOrDefault()?.Login;
            return Ok(new { friends = about_friends, formats = formats, login = login });
        }
        [Authorize]
        [HttpPost]
        [Route("get-subscribers")]
        public IActionResult GetSubscribers([FromBody] UserProfileModel model)
        {
            List<Account> subscribers = _context.accounts.Where(a =>
            _context.friendships.Where(f => f.RecipientId == model.AccountId && f.SenderId == a.Id).Any() &&
            !_context.friendships.Where(f => f.SenderId == model.AccountId && f.RecipientId == a.Id).Any()).ToList();
            List<AboutSubscriber> about_subcribers = new List<AboutSubscriber>();
            foreach (var subscriber in subscribers)
            {
                about_subcribers.Add(new AboutSubscriber
                {
                    AccountId = subscriber.Id,
                    Login = subscriber.Login
                });
            }
            return Ok(new {subscribers = about_subcribers });
        }
    }
}
