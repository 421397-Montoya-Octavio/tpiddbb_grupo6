using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WatchParty.Models;

public class MensajeChat
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("salaId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SalaId { get; set; } = null!;

    [BsonElement("usuarioId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UsuarioId { get; set; } = null!;

    [BsonElement("username")]
    public string Username { get; set; } = null!;

    [BsonElement("contenido")]
    public string Contenido { get; set; } = null!;

    [BsonElement("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}