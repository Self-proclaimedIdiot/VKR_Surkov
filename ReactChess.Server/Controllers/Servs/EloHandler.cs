using Microsoft.EntityFrameworkCore;
using ReactChess.Server.Models;

namespace ReactChess.Server.Controllers.Servs
{
    public class EloHandler
    {
        private readonly ChessContext _context = new ChessContext(new DbContextOptions<ChessContext>());
        private async Task SetEloByPlayerId(int number, int playerId, int formatId)
        {
            var elo = await _context.elos.Where(e => e.PlayerId == playerId && e.FormatId == formatId)
                .FirstOrDefaultAsync();
            elo.Number = number;
            _context.SaveChanges();
        }
        //здесь еще можно сделать user_personal_mul, а можно и не делать
        private async Task<int> NewElo(int user_elo, int opponent_elo, double game_res)
        {
            double expecting = 1 / (1 + Math.Pow(10, (opponent_elo - user_elo) / 400.0));
            return Convert.ToInt32(user_elo +  20*(game_res - expecting));
        }
        public async Task<int[]> HandleElo(int player1Id, int player2Id, int formatId, bool isDraw)
        {
            var player1Elo = await _context.elos.Where(e => e.PlayerId == player1Id && e.FormatId == formatId)
                .FirstOrDefaultAsync();
            var player2Elo = await _context.elos.Where(e => e.PlayerId == player2Id && e.FormatId == formatId)
                .FirstOrDefaultAsync();
            await SetEloByPlayerId(await NewElo(player1Elo.Number, player2Elo.Number, isDraw? 0.5 : 1), player1Id, formatId);
            await SetEloByPlayerId(await NewElo(player2Elo.Number, player1Elo.Number, isDraw? 0.5 : 0), player2Id, formatId);
            return [player1Elo.Number, player2Elo.Number];
        }
    }
}
