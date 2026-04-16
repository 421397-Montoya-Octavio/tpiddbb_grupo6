namespace WatchParty.Models.DTOs;

public class PeliculaDto
{
    public string Id { get; set; } = null!;
    public string Titulo { get; set; } = null!;
    public string Sinopsis { get; set; } = null!;
    public string UrlVideo { get; set; } = null!;
    public int Duracion { get; set; }
    public string PortadaUrl { get; set; } = null!;
}

public class CreatePeliculaDto
{
    public string Titulo { get; set; } = null!;
    public string Sinopsis { get; set; } = null!;
    public string UrlVideo { get; set; } = null!;
    public int Duracion { get; set; }
    public string PortadaUrl { get; set; } = null!;
}

public class UpdatePeliculaDto
{
    public string? Titulo { get; set; }
    public string? Sinopsis { get; set; }
    public string? UrlVideo { get; set; }
    public int? Duracion { get; set; }
    public string? PortadaUrl { get; set; }
}