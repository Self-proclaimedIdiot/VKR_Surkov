using System.Collections.Concurrent;

namespace ReactChess.Server.Controllers.Servs
{
    public class ConnectionIdsLog
    {
        private static readonly ConcurrentDictionary<string, string> connection_ids_log = new ConcurrentDictionary<string, string>();
        public async Task AddLog(string userId, string connectionId)
        {
            connection_ids_log.TryAdd(userId, connectionId);
        }
        public async Task RemoveLog(string userId, string connectionId)
        {
            connection_ids_log.Remove(userId, out connectionId);
        }
        public async Task<string> GetConnectionId(string userId)
        {
            if (connection_ids_log.Keys.Contains(userId))
                return connection_ids_log[userId];
            else
            {
                Console.WriteLine("No connection error!");
                return "NoConnection";
            }
        }
    }
}
