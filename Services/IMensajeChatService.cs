using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public interface IMensajeChatService
{
    Task<IEnumerable<MensajeChatDto>> GetBySalaIdAsync(string salaId);
    Task<MensajeChatDto> CreateAsync(string usuarioId, string username, CreateMensajeChatDto dto);
    Task<bool> DeleteAsync(string id);
}