using StackExchange.Redis;

namespace ReactChess.Server.Models
{
    public class Report
    {
        public int Id { get; set; }
        public string Text { get; set; }
        public int ReporterId { get; set; }
        public virtual Account Reporter {  get; set; }
        public int AccusedId { get; set; }
        public virtual Account Accused { get; set; }
        public int GameId { get; set; }
        public virtual Game? Game { get; set; }
    }
}
