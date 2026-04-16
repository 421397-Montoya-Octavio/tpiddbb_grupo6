using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson.Serialization.IdGenerators;

namespace WatchParty.Models;

public class Votacion
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("salaId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SalaId { get; set; } = null!;

    [BsonElement("opciones")]
    public List<OpcionVotacion> Opciones { get; set; } = new();

    [BsonElement("votosPorOpcion")]
    public Dictionary<string, int> VotosPorOpcion { get; set; } = new();

    [BsonElement("fechaInicio")]
    public DateTime FechaInicio { get; set; } = DateTime.UtcNow;

    [BsonElement("fechaFin")]
    public DateTime FechaFin { get; set; }

    [BsonElement("estaActiva")]
    public bool EstaActiva { get; set; } = true;

    [BsonElement("usuariosQueVotaron")]
    public Dictionary<string, string> UsuariosQueVotaron { get; set; } = new();
}

public class OpcionVotacion
{
    [BsonElement("peliculaId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string PeliculaId { get; set; } = null!;

    [BsonElement("titulo")]
    public string Titulo { get; set; } = null!;

    [BsonElement("portadaUrl")]
    public string PortadaUrl { get; set; } = null!;
}