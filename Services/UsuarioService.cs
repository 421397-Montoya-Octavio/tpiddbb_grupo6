using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using WatchParty.Data.Repositories;
using WatchParty.Models;
using WatchParty.Models.DTOs;

namespace WatchParty.Services;

public class UsuarioService : IUsuarioService
{
    private readonly IUsuarioRepository _repository;
    private readonly IConfiguration _configuration;

    public UsuarioService(IUsuarioRepository repository, IConfiguration configuration)
    {
        _repository = repository;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var existingEmail = await _repository.GetByEmailAsync(dto.Email);
        if (existingEmail != null)
            throw new InvalidOperationException("El email ya está registrado");

        var existingUsername = await _repository.GetByUsernameAsync(dto.Username);
        if (existingUsername != null)
            throw new InvalidOperationException("El nombre de usuario ya está en uso");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        var usuario = new Usuario
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = passwordHash,
            AuthProvider = AuthProvider.Local
        };

        var created = await _repository.CreateAsync(usuario);
        var token = GenerateJwtToken(created);

        return new AuthResponseDto
        {
            Token = token,
            Usuario = MapToDto(created)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var usuario = await _repository.GetByEmailAsync(dto.Email);
        if (usuario == null)
            throw new InvalidOperationException("Credenciales inválidas");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, usuario.PasswordHash))
            throw new InvalidOperationException("Credenciales inválidas");

        var token = GenerateJwtToken(usuario);

        return new AuthResponseDto
        {
            Token = token,
            Usuario = MapToDto(usuario)
        };
    }

    public async Task<UsuarioDto?> GetByIdAsync(string id)
    {
        var usuario = await _repository.GetByIdAsync(id);
        return usuario == null ? null : MapToDto(usuario);
    }

    private string GenerateJwtToken(Usuario usuario)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "WatchPartySecretKey12345678901234567890"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id),
            new Claim(ClaimTypes.Name, usuario.Username),
            new Claim(ClaimTypes.Email, usuario.Email)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "WatchParty",
            audience: _configuration["Jwt:Audience"] ?? "WatchParty",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UsuarioDto MapToDto(Usuario usuario) => new()
    {
        Id = usuario.Id,
        Username = usuario.Username,
        Email = usuario.Email,
        AuthProvider = usuario.AuthProvider.ToString()
    };
}