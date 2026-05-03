namespace ReactChess.Server.Models
{
    public class Friendship
    {
        public int Id { get; set; }
        public int SenderId { get; set; }
        public int RecipientId { get; set; }
        public virtual Account Sender { get; set; }
        public virtual Account Recipient { get; set; }
    }
}
