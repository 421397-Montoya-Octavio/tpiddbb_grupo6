using WatchParty.Models;

namespace WatchParty.Data.Repositories;

public interface IUsuarioRepository
{
    Task<IEnumerable<Usuario>> GetAllAsync();
    Task<Usuario?> GetByIdAsync(string id);
    Task<Usuario?> GetByEmailAsync(string email);
    Task<Usuario?> GetByUsernameAsync(string username);
    Task<Usuario> CreateAsync(Usuario usuario);
    Task<Usuario?> UpdateAsync(string id, Usuario usuario);
    Task<bool> DeleteAsync(string id);
}