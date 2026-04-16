using MongoDB.Driver;
using WatchParty.Models;

namespace WatchParty.Data;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(IConnectionStringProvider provider)
    {
        var connectionString = provider.GetConnectionString();
        var client = new MongoClient(connectionString);
        _database = client.GetDatabase(provider.GetDatabaseName());

        CreateIndexes();
    }

    public IMongoCollection<Pelicula> Peliculas => _database.GetCollection<Pelicula>("peliculas");
    public IMongoCollection<Usuario> Usuarios => _database.GetCollection<Usuario>("usuarios");
    public IMongoCollection<Sala> Salas => _database.GetCollection<Sala>("salas");
    public IMongoCollection<MensajeChat> MensajesChat => _database.GetCollection<MensajeChat>("mensajesChat");
    public IMongoCollection<Votacion> Votaciones => _database.GetCollection<Votacion>("votaciones");

    private void CreateIndexes()
    {
        var emailIndex = new CreateIndexModel<Usuario>(
            Builders<Usuario>.IndexKeys.Ascending(u => u.Email),
            new CreateIndexOptions { Unique = true });
        
        var usernameIndex = new CreateIndexModel<Usuario>(
            Builders<Usuario>.IndexKeys.Ascending(u => u.Username));

        var codigoIndex = new CreateIndexModel<Sala>(
            Builders<Sala>.IndexKeys.Ascending(s => s.CodigoAcceso),
            new CreateIndexOptions { Unique = true });

        var salaIdIndex = new CreateIndexModel<MensajeChat>(
            Builders<MensajeChat>.IndexKeys.Ascending(m => m.SalaId));

        Usuarios.Indexes.CreateMany(new[] { emailIndex, usernameIndex });
        Salas.Indexes.CreateMany(new[] { codigoIndex });
        MensajesChat.Indexes.CreateMany(new[] { salaIdIndex });
    }
}

public interface IConnectionStringProvider
{
    string GetConnectionString();
    string GetDatabaseName();
}