using StackExchange.Redis;

namespace ReactChess.Server.Models
{
    public class TitleRequest
    {
        public int Id { get; set; }
        public int PetitionerId { get; set; }
        public virtual Account Petitioner { get; set; }
        public string Title { get; set; }
        public string Info { get; set; }
    }
}
