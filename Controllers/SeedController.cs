using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using WatchParty.Data;
using WatchParty.Models;

namespace WatchParty.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SeedController : ControllerBase
{
    private readonly MongoDbContext _context;

    public SeedController(MongoDbContext context)
    {
        _context = context;
    }

    [HttpPost("peliculas")]
    public async Task<ActionResult> SeedPeliculas()
    {
        var existingCount = await _context.Peliculas.CountDocumentsAsync(_ => true);
        if (existingCount > 0)
        {
            return BadRequest(new { message = "Ya existen películas en la base de datos" });
        }

        var peliculas = new List<Pelicula>
        {
            new()
            {
                Titulo = "El Padrino",
                Sinopsis = "La saga de la familia Corleone, dirigida por Francis Ford Coppola.",
                UrlVideo = "https://www.youtube.com/watch?v=UaVTIH8mujA",
                Duracion = 175,
                PortadaUrl = "https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg"
            },
            new()
            {
                Titulo = "Matrix",
                Sinopsis = "Un hacker descubre la verdadera naturaleza de su realidad.",
                UrlVideo = "https://www.youtube.com/watch?v=vKQi3bBA1y8",
                Duracion = 136,
                PortadaUrl = "https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVhLWIzM2ItM2ZmMmZhYjRhNDRmXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_.jpg"
            },
            new()
            {
                Titulo = "El Señor de los Anillos: La Comunidad del Anillo",
                Sinopsis = "Frodo emprende un viaje para destruir el Anillo Único.",
                Duracion = 178,
                UrlVideo = "https://www.youtube.com/watch?v=V75dM6J3jOI",
                PortadaUrl = "https://m.media-amazon.com/images/M/MV5BN2FmZjYxMzUtYzljNS00NTg5LWJjYzItNmZjYjY5NDBmNmZmXkEyXkFqcGdeQXVyNDUzOTQ1MjM@._V1_.jpg"
            },
            new()
            {
                Titulo = "Interestelar",
                Sinopsis = "Un grupo de exploradores viaja a través de un agujero de gusano.",
                UrlVideo = "https://www.youtube.com/watch?v=zSWdZVtXT7E",
                Duracion = 169,
                PortadaUrl = "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFhMjktYjc2ZWM5YjRjNWU1XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_.jpg"
            },
            new()
            {
                Titulo = "Pulp Fiction",
                Sinopsis = "Historias entrelazadas de crimen en Los Ángeles.",
                UrlVideo = "https://www.youtube.com/watch?v=s7EdQ4FqbhY",
                Duracion = 154,
                PortadaUrl = "https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00TRM1LWIzMzUtNTY0NjNjM2QzNWE2XkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg"
            },
            new()
            {
                Titulo = "Gladiator",
                Sinopsis = "Un general romano reducido a esclavitud busca venganza.",
                UrlVideo = "https://www.youtube.com/watch?v=wnX6BKP2g5U",
                Duracion = 155,
                PortadaUrl = "https://m.media-amazon.com/images/M/MV5BMWFkYmI4YzQtNWU1NC00NjkxLWJjYmMtYzQyM2Q2Njc5YjQ3XkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_.jpg"
            },
            new()
            {
                Titulo = "Inception",
                Sinopsis = "Un ladrón que roba secretos a través de los sueños.",
                UrlVideo = "https://www.youtube.com/watch?v=YoHD9XEInc0",
                Duracion = 148,
                PortadaUrl = "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg"
            },
            new()
            {
                Titulo = "El Rey León",
                Sinopsis = "Simba descubre su verdadero destino como rey.",
                UrlVideo = "https://www.youtube.com/watch?v=4R0vT6W9pTQ",
                Duracion = 89,
                PortadaUrl = "https://m.media-amazon.com/images/M/MV5BMjIwNzE2MTQ4M15BMl5BanBnXkFtZTcwMzk2NDM3Mg@@._V1_.jpg"
            }
        };

        await _context.Peliculas.InsertManyAsync(peliculas);

        return Ok(new { message = $"Se insertaron {peliculas.Count} películas", count = peliculas.Count });
    }

    [HttpGet("status")]
    public async Task<ActionResult> GetStatus()
    {
        var peliculasCount = await _context.Peliculas.CountDocumentsAsync(_ => true);
        var usuariosCount = await _context.Usuarios.CountDocumentsAsync(_ => true);
        var salasCount = await _context.Salas.CountDocumentsAsync(_ => true);

        return Ok(new
        {
            peliculas = peliculasCount,
            usuarios = usuariosCount,
            salas = salasCount,
            ready = peliculasCount > 0
        });
    }
}