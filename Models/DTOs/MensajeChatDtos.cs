namespace WatchParty.Models.DTOs;

public class MensajeChatDto
{
    public string Id { get; set; } = null!;
    public string SalaId { get; set; } = null!;
    public string UsuarioId { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Contenido { get; set; } = null!;
    public DateTime Timestamp { get; set; }
}

public class CreateMensajeChatDto
{
    public string SalaId { get; set; } = null!;
    public string Contenido { get; set; } = null!;
}