using WatchParty.Models;

namespace WatchParty.Data.Repositories;

public interface IPeliculaRepository
{
    Task<IEnumerable<Pelicula>> GetAllAsync();
    Task<Pelicula?> GetByIdAsync(string id);
    Task<Pelicula> CreateAsync(Pelicula pelicula);
    Task<Pelicula?> UpdateAsync(string id, Pelicula pelicula);
    Task<bool> DeleteAsync(string id);
    Task<IEnumerable<Pelicula>> GetByIdsAsync(IEnumerable<string> ids);
}