using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public interface IUsuarioService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<UsuarioDto?> GetByIdAsync(string id);
}