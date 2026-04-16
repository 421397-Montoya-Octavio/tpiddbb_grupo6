namespace WatchParty.Models.DTOs;

public class VotacionDto
{
    public string Id { get; set; } = null!;
    public string SalaId { get; set; } = null!;
    public List<OpcionVotacionDto> Opciones { get; set; } = new();
    public Dictionary<string, int> VotosPorOpcion { get; set; } = new();
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public bool EstaActiva { get; set; }
}

public class OpcionVotacionDto
{
    public string PeliculaId { get; set; } = null!;
    public string Titulo { get; set; } = null!;
    public string PortadaUrl { get; set; } = null!;
}

public class CreateVotacionDto
{
    public string SalaId { get; set; } = null!;
    public List<string> PeliculaIds { get; set; } = new();
    public int DuracionMinutos { get; set; } = 2;
}

public class VotarDto
{
    public string VotacionId { get; set; } = null!;
    public string PeliculaId { get; set; } = null!;
}