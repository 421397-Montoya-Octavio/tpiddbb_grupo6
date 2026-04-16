using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public interface ISalaService
{
    Task<IEnumerable<SalaDto>> GetAllAsync();
    Task<SalaDto?> GetByIdAsync(string id);
    Task<SalaDto?> GetByCodigoAccesoAsync(string codigoAcceso);
    Task<SalaDto> CreateAsync(string? duenoId, CreateSalaDto dto);
    Task<SalaDto?> UpdateAsync(string id, UpdateSalaDto dto);
    Task<bool> DeleteAsync(string id);
}