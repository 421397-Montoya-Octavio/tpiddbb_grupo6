using StackExchange.Redis;

namespace WatchParty.Services;

public interface IRedisService
{
    Task Inicializar();
    Task AgregarParticipante(string salaId, string connectionId, string? username);
    Task QuitarParticipante(string salaId, string connectionId);
    Task<List<ParticipanteInfo>> GetParticipantes(string salaId);
    Task IncrementarContador(string key);
    Task<long> GetContador(string key);
    Task SetContador(string key, long value);
    Task<long> IncrementarYObtener(string key);
    Task<long> AgregarMensajeChat(string salaId, string mensajeJson);
    Task<List<string>> GetMensajesChat(string salaId, int cantidad = 20);
}

public class ParticipanteInfo
{
    public string ConnectionId { get; set; } = null!;
    public string? Username { get; set; }
    public bool IsAnonimo { get; set; }
    public int NumeroAnonimo { get; set; }
    public DateTime FechaConexion { get; set; }
}

public class RedisService : IRedisService
{
    private readonly IConfiguration _configuration;
    private ConnectionMultiplexer? _redis;
    private IDatabase? _db;

    public RedisService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task Inicializar()
    {
        try
        {
            var redisConnection = _configuration.GetConnectionString("Redis") ?? "localhost:6379";
            _redis = await ConnectionMultiplexer.ConnectAsync(redisConnection);
            _db = _redis.GetDatabase();
            Console.WriteLine("Redis conectado exitosamente");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error conectando a Redis: {ex.Message}");
        }
    }

    private IDatabase GetDb()
    {
        if (_db == null)
        {
            throw new InvalidOperationException("Redis no está inicializado");
        }
        return _db;
    }

    public async Task AgregarParticipante(string salaId, string connectionId, string? username)
    {
        var db = GetDb();
        var key = $"sala:{salaId}:participantes";
        
        var participante = new ParticipanteInfo
        {
            ConnectionId = connectionId,
            Username = username,
            IsAnonimo = string.IsNullOrEmpty(username),
            FechaConexion = DateTime.UtcNow
        };

        if (participante.IsAnonimo)
        {
            var anonimoKey = $"sala:{salaId}:anonimos";
            participante.NumeroAnonimo = (int)await db.StringIncrementAsync(anonimoKey);
        }

        await db.HashSetAsync(key, connectionId, System.Text.Json.JsonSerializer.Serialize(participante));
        
        await db.StringIncrementAsync($"sala:{salaId}:contador");
    }

    public async Task QuitarParticipante(string salaId, string connectionId)
    {
        var db = GetDb();
        var key = $"sala:{salaId}:participantes";
        
        await db.HashDeleteAsync(key, connectionId);
        
        var count = await db.StringDecrementAsync($"sala:{salaId}:contador");
        if (count < 0)
        {
            await db.StringSetAsync($"sala:{salaId}:contador", 0);
        }
    }

    public async Task<List<ParticipanteInfo>> GetParticipantes(string salaId)
    {
        var db = GetDb();
        var key = $"sala:{salaId}:participantes";
        
        var hashEntries = await db.HashGetAllAsync(key);
        var participantes = new List<ParticipanteInfo>();
        
        foreach (var entry in hashEntries)
        {
            try
            {
                var participante = System.Text.Json.JsonSerializer.Deserialize<ParticipanteInfo>(entry.Value.ToString());
                if (participante != null)
                {
                    participantes.Add(participante);
                }
            }
            catch
            {
            }
        }
        
        return participantes;
    }

    public async Task IncrementarContador(string key)
    {
        var db = GetDb();
        await db.StringIncrementAsync(key);
    }

    public async Task<long> GetContador(string key)
    {
        var db = GetDb();
        var value = await db.StringGetAsync(key);
        return value.HasValue ? (long)value : 0;
    }

    public async Task SetContador(string key, long value)
    {
        var db = GetDb();
        await db.StringSetAsync(key, value);
    }

    public async Task<long> IncrementarYObtener(string key)
    {
        var db = GetDb();
        return await db.StringIncrementAsync(key);
    }

    public async Task<long> AgregarMensajeChat(string salaId, string mensajeJson)
    {
        var db = GetDb();
        var key = $"chat:{salaId}";
        
        var length = await db.ListRightPushAsync(key, mensajeJson);
        
        await db.ListTrimAsync(key, -100, -1);
        
        return length;
    }

    public async Task<List<string>> GetMensajesChat(string salaId, int cantidad = 20)
    {
        var db = GetDb();
        var key = $"chat:{salaId}";
        
        var mensajes = await db.ListRangeAsync(key, -cantidad, -1);
        
        return mensajes.Select(m => m.ToString()).ToList();
    }
}