using WatchParty.Models;

namespace WatchParty.Data.Repositories;

public interface IVotacionRepository
{
    Task<IEnumerable<Votacion>> GetAllAsync();
    Task<Votacion?> GetByIdAsync(string id);
    Task<Votacion?> GetActivaBySalaIdAsync(string salaId);
    Task<Votacion> CreateAsync(Votacion votacion);
    Task<Votacion?> UpdateAsync(string id, Votacion votacion);
    Task<bool> DeleteAsync(string id);
}