namespace WatchParty.Models.DTOs;

public class SalaDto
{
    public string Id { get; set; } = null!;
    public string CodigoAcceso { get; set; } = null!;
    public string Estado { get; set; } = null!;
    public string? PeliculaActualId { get; set; }
    public string? DuenoId { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public class CreateSalaDto
{
    public string? PeliculaActualId { get; set; }
}

public class UpdateSalaDto
{
    public string? Estado { get; set; }
    public string? PeliculaActualId { get; set; }
}