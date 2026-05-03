namespace ReactChess.Server.Models
{
    public partial class Move
    {
        public int Id { get; set; }
        public string FEN { get; set; }
        public int GameId { get; set; }
        public virtual Game Game { get; set; }
        public TimeSpan Time { get; set; }
        public DateTime AbsoluteTime { get; set; }
    }
}
