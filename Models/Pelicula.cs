using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WatchParty.Models;

public class Pelicula
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("titulo")]
    public string Titulo { get; set; } = null!;

    [BsonElement("sinopsis")]
    public string Sinopsis { get; set; } = null!;

    [BsonElement("urlVideo")]
    public string UrlVideo { get; set; } = null!;

    [BsonElement("duracion")]
    public int Duracion { get; set; }

    [BsonElement("portadaUrl")]
    public string PortadaUrl { get; set; } = null!;
}