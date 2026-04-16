using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public interface IVotacionService
{
    Task<VotacionDto?> GetByIdAsync(string id);
    Task<VotacionDto?> GetActivaBySalaIdAsync(string salaId);
    Task<VotacionDto> CreateAsync(CreateVotacionDto dto);
    Task<VotacionDto?> VotarAsync(string usuarioId, VotarDto dto);
    Task<VotacionDto?> FinalizarVotacionAsync(string id);
    Task<(bool yaVoto, string? peliculaId)> GetVotoUsuarioAsync(string votacionId, string usuarioId);
}