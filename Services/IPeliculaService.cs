using WatchParty.Models;
using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public interface IPeliculaService
{
    Task<IEnumerable<PeliculaDto>> GetAllAsync();
    Task<PeliculaDto?> GetByIdAsync(string id);
    Task<PeliculaDto> CreateAsync(CreatePeliculaDto dto);
    Task<PeliculaDto?> UpdateAsync(string id, UpdatePeliculaDto dto);
    Task<bool> DeleteAsync(string id);
}