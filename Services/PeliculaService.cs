using WatchParty.Data.Repositories;
using WatchParty.Models;
using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public class PeliculaService : IPeliculaService
{
    private readonly IPeliculaRepository _repository;

    public PeliculaService(IPeliculaRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<PeliculaDto>> GetAllAsync()
    {
        var peliculas = await _repository.GetAllAsync();
        return peliculas.Select(MapToDto);
    }

    public async Task<PeliculaDto?> GetByIdAsync(string id)
    {
        var pelicula = await _repository.GetByIdAsync(id);
        return pelicula == null ? null : MapToDto(pelicula);
    }

    public async Task<PeliculaDto> CreateAsync(CreatePeliculaDto dto)
    {
        var pelicula = new Pelicula
        {
            Titulo = dto.Titulo,
            Sinopsis = dto.Sinopsis,
            UrlVideo = dto.UrlVideo,
            Duracion = dto.Duracion,
            PortadaUrl = dto.PortadaUrl
        };

        var created = await _repository.CreateAsync(pelicula);
        return MapToDto(created);
    }

    public async Task<PeliculaDto?> UpdateAsync(string id, UpdatePeliculaDto dto)
    {
        var existing = await _repository.GetByIdAsync(id);
        if (existing == null) return null;

        var updated = new Pelicula
        {
            Id = existing.Id,
            Titulo = dto.Titulo ?? existing.Titulo,
            Sinopsis = dto.Sinopsis ?? existing.Sinopsis,
            UrlVideo = dto.UrlVideo ?? existing.UrlVideo,
            Duracion = dto.Duracion ?? existing.Duracion,
            PortadaUrl = dto.PortadaUrl ?? existing.PortadaUrl
        };

        var result = await _repository.UpdateAsync(id, updated);
        return result == null ? null : MapToDto(result);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        return await _repository.DeleteAsync(id);
    }

    private static PeliculaDto MapToDto(Pelicula pelicula) => new()
    {
        Id = pelicula.Id,
        Titulo = pelicula.Titulo,
        Sinopsis = pelicula.Sinopsis,
        UrlVideo = pelicula.UrlVideo,
        Duracion = pelicula.Duracion,
        PortadaUrl = pelicula.PortadaUrl
    };
}