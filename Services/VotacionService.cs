using WatchParty.Data.Repositories;
using WatchParty.Models;
using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public class VotacionService : IVotacionService
{
    private readonly IVotacionRepository _votacionRepository;
    private readonly IPeliculaRepository _peliculaRepository;

    public VotacionService(IVotacionRepository votacionRepository, IPeliculaRepository peliculaRepository)
    {
        _votacionRepository = votacionRepository;
        _peliculaRepository = peliculaRepository;
    }

    public async Task<VotacionDto?> GetByIdAsync(string id)
    {
        var votacion = await _votacionRepository.GetByIdAsync(id);
        return votacion == null ? null : MapToDto(votacion);
    }

    public async Task<VotacionDto?> GetActivaBySalaIdAsync(string salaId)
    {
        var votacion = await _votacionRepository.GetActivaBySalaIdAsync(salaId);
        return votacion == null ? null : MapToDto(votacion);
    }

    public async Task<VotacionDto> CreateAsync(CreateVotacionDto dto)
    {
        var peliculas = await _peliculaRepository.GetByIdsAsync(dto.PeliculaIds);
        var opciones = peliculas.Select(p => new OpcionVotacion
        {
            PeliculaId = p.Id,
            Titulo = p.Titulo,
            PortadaUrl = p.PortadaUrl
        }).ToList();

        var votosPorOpcion = new Dictionary<string, int>();
        foreach (var pelicula in peliculas)
        {
            votosPorOpcion[pelicula.Id] = 0;
        }

        var votacion = new Votacion
        {
            SalaId = dto.SalaId,
            Opciones = opciones,
            VotosPorOpcion = votosPorOpcion,
            FechaInicio = DateTime.UtcNow,
            FechaFin = DateTime.UtcNow.AddMinutes(dto.DuracionMinutos),
            EstaActiva = true
        };

        var created = await _votacionRepository.CreateAsync(votacion);
        return MapToDto(created);
    }

    public async Task<VotacionDto?> VotarAsync(string usuarioId, VotarDto dto)
    {
        var votacion = await _votacionRepository.GetByIdAsync(dto.VotacionId);
        if (votacion == null || !votacion.EstaActiva)
            return null;

        if (DateTime.UtcNow > votacion.FechaFin)
        {
            votacion.EstaActiva = false;
            await _votacionRepository.UpdateAsync(dto.VotacionId, votacion);
            return null;
        }

        var opcionValida = votacion.Opciones.Any(o => o.PeliculaId == dto.PeliculaId);
        if (!opcionValida) return null;

        if (votacion.VotosPorOpcion.ContainsKey(dto.PeliculaId))
        {
            votacion.VotosPorOpcion[dto.PeliculaId]++;
        }

        var updated = await _votacionRepository.UpdateAsync(dto.VotacionId, votacion);
        return updated == null ? null : MapToDto(updated);
    }

    public async Task<VotacionDto?> FinalizarVotacionAsync(string id)
    {
        var votacion = await _votacionRepository.GetByIdAsync(id);
        if (votacion == null) return null;

        votacion.EstaActiva = false;
        votacion.FechaFin = DateTime.UtcNow;

        var updated = await _votacionRepository.UpdateAsync(id, votacion);
        return updated == null ? null : MapToDto(updated);
    }

    private static VotacionDto MapToDto(Votacion votacion) => new()
    {
        Id = votacion.Id,
        SalaId = votacion.SalaId,
        Opciones = votacion.Opciones.Select(o => new OpcionVotacionDto
        {
            PeliculaId = o.PeliculaId,
            Titulo = o.Titulo,
            PortadaUrl = o.PortadaUrl
        }).ToList(),
        VotosPorOpcion = votacion.VotosPorOpcion,
        FechaInicio = votacion.FechaInicio,
        FechaFin = votacion.FechaFin,
        EstaActiva = votacion.EstaActiva
    };
}