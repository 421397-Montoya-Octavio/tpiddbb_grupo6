using WatchParty.Data.Repositories;
using WatchParty.Models;
using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public class SalaService : ISalaService
{
    private readonly ISalaRepository _repository;

    public SalaService(ISalaRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<SalaDto>> GetAllAsync()
    {
        var salas = await _repository.GetAllAsync();
        return salas.Select(MapToDto);
    }

    public async Task<SalaDto?> GetByIdAsync(string id)
    {
        var sala = await _repository.GetByIdAsync(id);
        return sala == null ? null : MapToDto(sala);
    }

    public async Task<SalaDto?> GetByCodigoAccesoAsync(string codigoAcceso)
    {
        var sala = await _repository.GetByCodigoAccesoAsync(codigoAcceso);
        return sala == null ? null : MapToDto(sala);
    }

    public async Task<SalaDto> CreateAsync(string? duenoId, CreateSalaDto dto)
    {
        var codigoAcceso = GenerateCodigoAcceso();

        var sala = new Sala
        {
            CodigoAcceso = codigoAcceso,
            Estado = EstadoSala.Esperando,
            PeliculaActualId = dto.PeliculaActualId,
            DuenoId = duenoId,
            FechaCreacion = DateTime.UtcNow
        };

        var created = await _repository.CreateAsync(sala);
        return MapToDto(created);
    }

    public async Task<SalaDto?> UpdateAsync(string id, UpdateSalaDto dto)
    {
        var existing = await _repository.GetByIdAsync(id);
        if (existing == null) return null;

        var updated = new Sala
        {
            Id = existing.Id,
            CodigoAcceso = existing.CodigoAcceso,
            Estado = dto.Estado != null ? Enum.Parse<EstadoSala>(dto.Estado) : existing.Estado,
            PeliculaActualId = dto.PeliculaActualId ?? existing.PeliculaActualId,
            DuenoId = existing.DuenoId,
            FechaCreacion = existing.FechaCreacion
        };

        var result = await _repository.UpdateAsync(id, updated);
        return result == null ? null : MapToDto(result);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        return await _repository.DeleteAsync(id);
    }

    private static string GenerateCodigoAcceso()
    {
        const string chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        var random = new Random();
        return new string(Enumerable.Range(0, 6)
            .Select(_ => chars[random.Next(chars.Length)])
            .ToArray());
    }

    private static SalaDto MapToDto(Sala sala) => new()
    {
        Id = sala.Id,
        CodigoAcceso = sala.CodigoAcceso,
        Estado = sala.Estado.ToString(),
        PeliculaActualId = sala.PeliculaActualId,
        DuenoId = sala.DuenoId,
        FechaCreacion = sala.FechaCreacion
    };
}