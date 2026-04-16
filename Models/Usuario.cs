using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WatchParty.Models;

public class Usuario
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("username")]
    public string Username { get; set; } = null!;

    [BsonElement("email")]
    public string Email { get; set; } = null!;

    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = null!;

    [BsonElement("authProvider")]
    [BsonRepresentation(BsonType.String)]
    public AuthProvider AuthProvider { get; set; } = AuthProvider.Local;
}

public enum AuthProvider
{
    Local,
    Google
}