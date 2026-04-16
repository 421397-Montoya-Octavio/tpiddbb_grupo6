using WatchParty.Models;

namespace WatchParty.Data.Repositories;

public interface IMensajeChatRepository
{
    Task<IEnumerable<MensajeChat>> GetBySalaIdAsync(string salaId);
    Task<MensajeChat?> GetByIdAsync(string id);
    Task<MensajeChat> CreateAsync(MensajeChat mensaje);
    Task<bool> DeleteAsync(string id);
    Task<bool> DeleteBySalaIdAsync(string salaId);
}