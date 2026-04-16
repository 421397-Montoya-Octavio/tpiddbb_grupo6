using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WatchParty.Models;

public class Sala
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("codigoAcceso")]
    public string CodigoAcceso { get; set; } = null!;

    [BsonElement("estado")]
    [BsonRepresentation(BsonType.String)]
    public EstadoSala Estado { get; set; } = EstadoSala.Esperando;

    [BsonElement("peliculaActualId")]
    public string? PeliculaActualId { get; set; }

    [BsonElement("duenoId")]
    public string? DuenoId { get; set; }

    [BsonElement("peliculasParaVotar")]
    public List<string> PeliculasParaVotar { get; set; } = new();

    [BsonElement("fechaCreacion")]
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}

public enum EstadoSala
{
    Esperando,
    Reproduciendo,
    Votando
}