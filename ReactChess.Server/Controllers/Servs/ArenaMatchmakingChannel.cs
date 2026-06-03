using System.Threading.Channels;

namespace ReactChess.Server.Controllers.Servs
{
    // Запрос на поиск соперника в арене турнира
    public record ArenaSearchRequest(string UserId, string ConnectionId, int TournamentId);

    public class ArenaMatchmakingChannel
    {
        private readonly Channel<ArenaSearchRequest> _channel = Channel.CreateBounded<ArenaSearchRequest>(1000);
        public ChannelWriter<ArenaSearchRequest> Writer => _channel.Writer;
        public ChannelReader<ArenaSearchRequest> Reader => _channel.Reader;
    }
}
