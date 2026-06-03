namespace ReactChess.Server.Models
{
    public class TournamentParticipant
    {
        public int Id { get; set; }
        public int TournamentId { get; set; }
        public int AccountId { get; set; }
        public virtual Tournament Tournament { get; set; }
        public virtual Account Account { get; set; }

    }
}
