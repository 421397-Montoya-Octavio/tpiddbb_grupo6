using MongoDB.Driver;
using WatchParty.Models;

namespace WatchParty.Data.Repositories;

public class MensajeChatRepository : IMensajeChatRepository
{
    private readonly IMongoDbContext _context;

    public MensajeChatRepository(IMongoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MensajeChat>> GetBySalaIdAsync(string salaId)
    {
        return await _context.MensajesChat
            .Find(m => m.SalaId == salaId)
            .SortBy(m => m.Timestamp)
            .ToListAsync();
    }

    public async Task<MensajeChat?> GetByIdAsync(string id)
    {
        return await _context.MensajesChat
            .Find(m => m.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<MensajeChat> CreateAsync(MensajeChat mensaje)
    {
        await _context.MensajesChat.InsertOneAsync(mensaje);
        return mensaje;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _context.MensajesChat.DeleteOneAsync(m => m.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> DeleteBySalaIdAsync(string salaId)
    {
        var result = await _context.MensajesChat.DeleteManyAsync(m => m.SalaId == salaId);
        return result.DeletedCount > 0;
    }
}
