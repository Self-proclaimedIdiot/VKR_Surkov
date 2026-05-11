using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Query.Internal;
using ReactChess.Server.Models;
using System.Security.Principal;
namespace ReactChess.Server.Controllers.Servs
{
    public class CommonHub : Hub
    {
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        public async Task SendGameInvite(int opponentId_n, int formatId_n)
        {
            string opponentId = opponentId_n.ToString();
            var account = await _context.accounts.Where(a => a.Id == Convert.ToInt32(Context.UserIdentifier)).FirstOrDefaultAsync();
            var player = await _context.players.Where(p => p.AccountId == account.Id).FirstOrDefaultAsync();
            var elo = await _context.elos.Where(e => e.PlayerId == player.Id &&
            e.FormatId == formatId_n).FirstOrDefaultAsync();
            var format = await _context.timeFormats.Where(tf => tf.Id == formatId_n).FirstOrDefaultAsync();
            await Clients.User(opponentId).SendAsync("GameInviteReceived", new
            {
                opponentId = Context.UserIdentifier,
                formatId = formatId_n,
                opponentLogin = account.Login,
                opponentElo = elo.Number,
                formatName = format.Name
            });
        }
        public async Task AcceptGameInvite (int opponentId_n, int formatId_n)
        {
            string opponentId = opponentId_n.ToString();
            await Clients.User(opponentId).SendAsync("StartDuel", new
            {
                opponentId = Context.UserIdentifier,
                formatId = formatId_n,
            });
            await Clients.User(Context.UserIdentifier).SendAsync("StartDuel", new
            {
                opponentId = opponentId,
                formatId = formatId_n,
            });
        }
        public async Task DeclineGameInvite(int opponentId_n)
        {
            string opponentId = opponentId_n.ToString();
            await Clients.User(opponentId).SendAsync("MessageReceived", new { message = "Вызоы отклонен!" });
        }
        public async Task SendFriendshipInvite(int recipientId_n)
        {
            string recipientId = recipientId_n.ToString();
            int accountId = Convert.ToInt32(Context.UserIdentifier);
            if (!_context.friendships.Where(f => f.RecipientId == recipientId_n && f.SenderId == accountId).Any())
            {
                _context.friendships.Add(new Friendship
                {
                    SenderId = accountId,
                    RecipientId = recipientId_n
                });
                _context.SaveChanges();
            }
            var account = await _context.accounts.Where(a => a.Id == accountId).FirstOrDefaultAsync();
            await Clients.User(recipientId).SendAsync("FriendshipInviteReceived", new
            {
                friendLogin = account.Login,
                friendId = Context.UserIdentifier
            });
        }
        public async Task AcceptFriendshipInvite(int senderId_n)
        {
            string senderId = senderId_n.ToString();
            int accountId = Convert.ToInt32(Context.UserIdentifier);
            if (!_context.friendships.Where(f => f.RecipientId == senderId_n && f.SenderId == accountId).Any())
            {
                _context.friendships.Add(new Friendship
                {
                    SenderId = accountId,
                    RecipientId = senderId_n
                });
                _context.SaveChanges();
            }
            await Clients.User(senderId).SendAsync("MessageReceived", new {message = "Заявка принята!" });
        }
        public async Task DeclineFriendshipInvite(int senderId_n)
        {
            string senderId = senderId_n.ToString();
            int accountId = Convert.ToInt32(Context.UserIdentifier);
            var friendship = await _context.friendships
                .Where(f => f.SenderId == senderId_n && f.RecipientId == accountId).FirstOrDefaultAsync();
            _context.friendships.Remove(friendship);
            _context.SaveChanges();
            await Clients.User(senderId).SendAsync("MessageReceived", new { message = "Заявка отклонена!" });
        }
        public async Task SendRefuseFriendship(int friend_n)
        {
            int accountId = Convert.ToInt32(Context.UserIdentifier);
            var friendship = await _context.friendships.Where(f => f.SenderId == accountId && f.RecipientId == friend_n)
                .FirstOrDefaultAsync();
            _context.friendships.Remove(friendship);
            _context.SaveChanges();
        }
        public override async Task OnConnectedAsync()
        {
            Console.WriteLine("Connected to the common hub!" + Context.UserIdentifier);
            await Groups.AddToGroupAsync(Context.ConnectionId, "common");
        }
    }
}
