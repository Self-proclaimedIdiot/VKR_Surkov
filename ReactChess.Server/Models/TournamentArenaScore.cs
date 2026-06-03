namespace ReactChess.Server.Models
{
    public class TournamentArenaScore
    {
        public int Id { get; set; }
        public int TournamentId { get; set; }
        public int AccountId { get; set; }
        public int Wins { get; set; } = 0;
        public int Draws { get; set; } = 0;
        public int Losses { get; set; } = 0;
        public virtual Tournament Tournament { get; set; }
        public virtual Account Account { get; set; }
    }
}
