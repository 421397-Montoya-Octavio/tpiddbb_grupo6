using WatchParty.Data.Repositories;
using WatchParty.Models;
using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public class MensajeChatService : IMensajeChatService
{
    private readonly IMensajeChatRepository _repository;

    public MensajeChatService(IMensajeChatRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<MensajeChatDto>> GetBySalaIdAsync(string salaId)
    {
        var mensajes = await _repository.GetBySalaIdAsync(salaId);
        return mensajes.Select(MapToDto);
    }

    public async Task<MensajeChatDto> CreateAsync(string usuarioId, string username, CreateMensajeChatDto dto)
    {
        var mensaje = new MensajeChat
        {
            SalaId = dto.SalaId,
            UsuarioId = usuarioId,
            Username = username,
            Contenido = dto.Contenido,
            Timestamp = DateTime.UtcNow
        };

        var created = await _repository.CreateAsync(mensaje);
        return MapToDto(created);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        return await _repository.DeleteAsync(id);
    }

    private static MensajeChatDto MapToDto(MensajeChat mensaje) => new()
    {
        Id = mensaje.Id,
        SalaId = mensaje.SalaId,
        UsuarioId = mensaje.UsuarioId,
        Username = mensaje.Username,
        Contenido = mensaje.Contenido,
        Timestamp = mensaje.Timestamp
    };
}