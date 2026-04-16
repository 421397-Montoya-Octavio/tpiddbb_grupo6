using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public class MensajeChatService : IMensajeChatService
{
    private readonly IRedisService _redisService;

    public MensajeChatService(IRedisService redisService)
    {
        _redisService = redisService;
    }

    public async Task<IEnumerable<MensajeChatDto>> GetBySalaIdAsync(string salaId)
    {
        var mensajesJson = await _redisService.GetMensajesChat(salaId, 100);
        
        var mensajes = mensajesJson
            .Select(json => System.Text.Json.JsonSerializer.Deserialize<MensajeChatDto>(json))
            .Where(m => m != null)
            .Select(m => m!)
            .OrderBy(m => m.Timestamp)
            .ToList();
        
        return mensajes;
    }

    public async Task<MensajeChatDto> CreateAsync(string usuarioId, string username, CreateMensajeChatDto dto)
    {
        var mensaje = new MensajeChatDto
        {
            Id = Guid.NewGuid().ToString(),
            SalaId = dto.SalaId,
            UsuarioId = usuarioId,
            Username = username,
            Contenido = dto.Contenido,
            Timestamp = DateTime.UtcNow
        };

        var mensajeJson = System.Text.Json.JsonSerializer.Serialize(mensaje);
        await _redisService.AgregarMensajeChat(dto.SalaId, mensajeJson);
        
        return mensaje;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        return true;
    }
}
