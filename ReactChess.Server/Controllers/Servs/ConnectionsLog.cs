using System.Collections.Concurrent;

namespace ReactChess.Server.Controllers.Servs
{
    public class ConnectionsLog
    {
        private static readonly ConcurrentDictionary<string, string> connections_log = new ConcurrentDictionary<string, string>();
        public async Task AddLog(string clientId, string groupId)
        {
            connections_log.TryAdd(clientId, groupId);
        }
        public async Task RemoveLog(string clientId, string groupId)
        {
            connections_log.Remove(clientId, out groupId);
        }
        public async Task<string> GetGroupId(string clientId)
        {
            if (connections_log.Keys.Contains(clientId))
                return connections_log[clientId];
            else
            {
                Console.WriteLine("No group error!");
                return "NoGroup";
            }
        }
    }
}
