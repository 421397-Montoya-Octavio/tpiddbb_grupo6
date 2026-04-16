using MongoDB.Driver;
using WatchParty.Models;

namespace WatchParty.Data.Repositories;

public class SalaRepository : ISalaRepository
{
    private readonly IMongoDbContext _context;

    public SalaRepository(IMongoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Sala>> GetAllAsync()
    {
        return await _context.Salas.Find(_ => true).ToListAsync();
    }

    public async Task<Sala?> GetByIdAsync(string id)
    {
        return await _context.Salas
            .Find(s => s.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<Sala?> GetByCodigoAccesoAsync(string codigoAcceso)
    {
        return await _context.Salas
            .Find(s => s.CodigoAcceso == codigoAcceso)
            .FirstOrDefaultAsync();
    }

    public async Task<Sala> CreateAsync(Sala sala)
    {
        await _context.Salas.InsertOneAsync(sala);
        return sala;
    }

    public async Task<Sala?> UpdateAsync(string id, Sala sala)
    {
        return await _context.Salas
            .FindOneAndReplaceAsync(s => s.Id == id, sala);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _context.Salas.DeleteOneAsync(s => s.Id == id);
        return result.DeletedCount > 0;
    }
}
