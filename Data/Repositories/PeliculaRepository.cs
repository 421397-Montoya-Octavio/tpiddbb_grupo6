using MongoDB.Driver;
using WatchParty.Models;

namespace WatchParty.Data.Repositories;

public class PeliculaRepository : IPeliculaRepository
{
    private readonly IMongoDbContext _context;

    public PeliculaRepository(IMongoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Pelicula>> GetAllAsync()
    {
        return await _context.Peliculas.Find(_ => true).ToListAsync();
    }

    public async Task<Pelicula?> GetByIdAsync(string id)
    {
        return await _context.Peliculas
            .Find(p => p.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<Pelicula> CreateAsync(Pelicula pelicula)
    {
        await _context.Peliculas.InsertOneAsync(pelicula);
        return pelicula;
    }

    public async Task<Pelicula?> UpdateAsync(string id, Pelicula pelicula)
    {
        return await _context.Peliculas
            .FindOneAndReplaceAsync(p => p.Id == id, pelicula);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _context.Peliculas.DeleteOneAsync(p => p.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<IEnumerable<Pelicula>> GetByIdsAsync(IEnumerable<string> ids)
    {
        var filter = Builders<Pelicula>.Filter.In(p => p.Id, ids);
        return await _context.Peliculas.Find(filter).ToListAsync();
    }
}
