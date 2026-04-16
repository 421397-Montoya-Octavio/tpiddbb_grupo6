using MongoDB.Driver;
using WatchParty.Models;

namespace WatchParty.Data.Repositories;

public class UsuarioRepository : IUsuarioRepository
{
    private readonly IMongoDbContext _context;

    public UsuarioRepository(IMongoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Usuario>> GetAllAsync()
    {
        return await _context.Usuarios.Find(_ => true).ToListAsync();
    }

    public async Task<Usuario?> GetByIdAsync(string id)
    {
        return await _context.Usuarios
            .Find(u => u.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<Usuario?> GetByEmailAsync(string email)
    {
        return await _context.Usuarios
            .Find(u => u.Email == email)
            .FirstOrDefaultAsync();
    }

    public async Task<Usuario?> GetByUsernameAsync(string username)
    {
        return await _context.Usuarios
            .Find(u => u.Username == username)
            .FirstOrDefaultAsync();
    }

    public async Task<Usuario> CreateAsync(Usuario usuario)
    {
        await _context.Usuarios.InsertOneAsync(usuario);
        return usuario;
    }

    public async Task<Usuario?> UpdateAsync(string id, Usuario usuario)
    {
        return await _context.Usuarios
            .FindOneAndReplaceAsync(u => u.Id == id, usuario);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _context.Usuarios.DeleteOneAsync(u => u.Id == id);
        return result.DeletedCount > 0;
    }
}
