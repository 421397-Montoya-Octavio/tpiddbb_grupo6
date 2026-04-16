using WatchParty.Models;

namespace WatchParty.Data.Repositories;

public interface ISalaRepository
{
    Task<IEnumerable<Sala>> GetAllAsync();
    Task<Sala?> GetByIdAsync(string id);
    Task<Sala?> GetByCodigoAccesoAsync(string codigoAcceso);
    Task<Sala> CreateAsync(Sala sala);
    Task<Sala?> UpdateAsync(string id, Sala sala);
    Task<bool> DeleteAsync(string id);
}