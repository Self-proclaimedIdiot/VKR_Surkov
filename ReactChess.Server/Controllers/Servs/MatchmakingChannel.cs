using System.Threading.Channels;

namespace ReactChess.Server.Controllers.Servs
{
    //оберточный класс во славу абстракции
    public record SearchRequest(string UserId, string ConnectionId, string TimeFormatId);
    public class MatchmakingChannel
    {
        private readonly Channel<SearchRequest> _channel = Channel.CreateBounded<SearchRequest>(1000);

        public ChannelWriter<SearchRequest> Writer => _channel.Writer;
        public ChannelReader<SearchRequest> Reader => _channel.Reader;
    }
}
