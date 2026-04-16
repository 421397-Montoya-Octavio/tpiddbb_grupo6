using MongoDB.Driver;
using WatchParty.Models;

namespace WatchParty.Data.Repositories;

public class VotacionRepository : IVotacionRepository
{
    private readonly MongoDbContext _context;

    public VotacionRepository(MongoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Votacion>> GetAllAsync()
    {
        return await _context.Votaciones.Find(_ => true).ToListAsync();
    }

    public async Task<Votacion?> GetByIdAsync(string id)
    {
        return await _context.Votaciones
            .Find(v => v.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<Votacion?> GetActivaBySalaIdAsync(string salaId)
    {
        var filter = Builders<Votacion>.Filter.And(
            Builders<Votacion>.Filter.Eq(v => v.SalaId, salaId),
            Builders<Votacion>.Filter.Eq(v => v.EstaActiva, true)
        );
        return await _context.Votaciones
            .Find(filter)
            .FirstOrDefaultAsync();
    }

    public async Task<Votacion> CreateAsync(Votacion votacion)
    {
        await _context.Votaciones.InsertOneAsync(votacion);
        return votacion;
    }

    public async Task<Votacion?> UpdateAsync(string id, Votacion votacion)
    {
        return await _context.Votaciones
            .FindOneAndReplaceAsync(v => v.Id == id, votacion);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _context.Votaciones.DeleteOneAsync(v => v.Id == id);
        return result.DeletedCount > 0;
    }
}