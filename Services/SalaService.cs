using WatchParty.Data.Repositories;
using WatchParty.Models;
using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public class SalaService : ISalaService
{
    private readonly ISalaRepository _repository;
    private readonly IUsuarioRepository _usuarioRepository;

    public SalaService(ISalaRepository repository, IUsuarioRepository usuarioRepository)
    {
        _repository = repository;
        _usuarioRepository = usuarioRepository;
    }

    public async Task<IEnumerable<SalaDto>> GetAllAsync()
    {
        var salas = await _repository.GetAllAsync();
        var dtos = new List<SalaDto>();
        foreach (var sala in salas)
        {
            dtos.Add(await MapToDtoAsync(sala));
        }
        return dtos;
    }

    public async Task<SalaDto?> GetByIdAsync(string id)
    {
        var sala = await _repository.GetByIdAsync(id);
        return sala == null ? null : await MapToDtoAsync(sala);
    }

    public async Task<SalaDto?> GetByCodigoAccesoAsync(string codigoAcceso)
    {
        var sala = await _repository.GetByCodigoAccesoAsync(codigoAcceso);
        return sala == null ? null : await MapToDtoAsync(sala);
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
        return await MapToDtoAsync(created);
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
            PeliculasParaVotar = dto.PeliculasParaVotar ?? existing.PeliculasParaVotar,
            FechaCreacion = existing.FechaCreacion
        };

        var result = await _repository.UpdateAsync(id, updated);
        return result == null ? null : await MapToDtoAsync(result);
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

    private async Task<SalaDto> MapToDtoAsync(Sala sala)
    {
        string? duenoUsername = null;
        if (!string.IsNullOrEmpty(sala.DuenoId))
        {
            var usuario = await _usuarioRepository.GetByIdAsync(sala.DuenoId);
            duenoUsername = usuario?.Username;
        }

        return new SalaDto
        {
            Id = sala.Id,
            CodigoAcceso = sala.CodigoAcceso,
            Estado = sala.Estado.ToString(),
            PeliculaActualId = sala.PeliculaActualId,
            DuenoId = sala.DuenoId,
            DuenoUsername = duenoUsername,
            PeliculasParaVotar = sala.PeliculasParaVotar,
            FechaCreacion = sala.FechaCreacion
        };
    }
}