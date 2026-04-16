using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using WatchParty.Models.DTOs;
using WatchParty.Models;
using WatchParty.Services;

namespace WatchParty.Hubs;

// 1. QUITAMOS EL [Authorize] DE AQUÍ ARRIBA
public class ChatHub : Hub
{
    private readonly IMensajeChatService _mensajeService;
    private readonly ISalaService _salaService;
    private readonly IVotacionService _votacionService;
    private readonly IRedisService _redisService;
    private static readonly Dictionary<string, string> _connectionSalaMap = new();

    public ChatHub(
        IMensajeChatService mensajeService,
        ISalaService salaService,
        IVotacionService votacionService,
        IRedisService redisService)
    {
        _mensajeService = mensajeService;
        _salaService = salaService;
        _votacionService = votacionService;
        _redisService = redisService;
    }

    // Método libre: cualquiera puede entrar a la sala
    public async Task JoinSala(string salaId)
    {
        var sala = await _salaService.GetByIdAsync(salaId);
        if (sala == null)
        {
            throw new HubException("Sala no encontrada");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, salaId);

        _connectionSalaMap[Context.ConnectionId] = salaId;

        var username = GetUsername();
        await _redisService.AgregarParticipante(salaId, Context.ConnectionId, username);

        var participantes = await _redisService.GetParticipantes(salaId);
        await Clients.Caller.SendAsync("ParticipantesActualizados", participantes);

        await Clients.Group(salaId).SendAsync("NuevoParticipante", new
        {
            connectionId = Context.ConnectionId,
            username = username,
            isAnonimo = string.IsNullOrEmpty(username),
            numeroAnonimo = participantes.Count(p => p.IsAnonimo)
        });
    }

    // Método libre: cualquiera puede salir
    public async Task LeaveSala(string salaId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, salaId);
        await _redisService.QuitarParticipante(salaId, Context.ConnectionId);
        _connectionSalaMap.Remove(Context.ConnectionId);

        await Clients.Group(salaId).SendAsync("ParticipanteDesconectado", new
        {
            connectionId = Context.ConnectionId,
            salaId
        });
    }

    // 2. PROTEGEMOS ESTE MÉTODO: Solo registrados chatean
    [Authorize]
    public async Task EnviarMensaje(string salaId, string contenido)
    {
        var userId = GetUserId();
        var username = GetUsername();

        var dto = new CreateMensajeChatDto
        {
            SalaId = salaId,
            Contenido = contenido
        };

        var mensaje = await _mensajeService.CreateAsync(userId, username, dto);

        await Clients.Group(salaId).SendAsync("RecibirMensaje", mensaje);
    }

    // 2. PROTEGEMOS ESTE MÉTODO
    [Authorize]
    public async Task IniciarVotacion(string salaId, List<string> peliculaIds)
    {
        var sala = await _salaService.GetByIdAsync(salaId);
        if (sala == null) throw new HubException("Sala no encontrada");

        var dto = new CreateVotacionDto
        {
            SalaId = salaId,
            PeliculaIds = peliculaIds,
            DuracionMinutos = 2
        };

        var votacion = await _votacionService.CreateAsync(dto);

        var updateSalaDto = new UpdateSalaDto
        {
            Estado = "Votando"
        };
        await _salaService.UpdateAsync(salaId, updateSalaDto);

        await Clients.Group(salaId).SendAsync("VotacionIniciada", votacion);
    }

    // 2. PROTEGEMOS ESTE MÉTODO
    [Authorize]
    public async Task Votar(string votacionId, string peliculaId)
    {
        var userId = GetUserId();

        var dto = new VotarDto
        {
            VotacionId = votacionId,
            PeliculaId = peliculaId
        };

        var votacionActualizada = await _votacionService.VotarAsync(userId, dto);
        if (votacionActualizada != null)
        {
            await Clients.All.SendAsync("VotosActualizados", votacionActualizada);
        }
    }

    // Método libre
    public async Task<string?> ObtenerVotacionActiva(string salaId)
    {
        var votacion = await _votacionService.GetActivaBySalaIdAsync(salaId);
        return votacion?.Id;
    }

    // 2. PROTEGEMOS ESTE MÉTODO
    [Authorize]
    public async Task ActualizarSala(string salaId, object salaData)
    {
        await Clients.Group(salaId).SendAsync("SalaActualizada", salaData);
    }

    // Método libre
    public async Task<List<ParticipanteInfo>> ObtenerParticipantes(string salaId)
    {
        return await _redisService.GetParticipantes(salaId);
    }

    // Método libre
    public async Task<SalaDto?> GetSalaInfo(string salaId)
    {
        return await _salaService.GetByIdAsync(salaId);
    }

    // Método libre (se dispara automático al cerrar pestaña)
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_connectionSalaMap.TryGetValue(Context.ConnectionId, out var salaId))
        {
            await _redisService.QuitarParticipante(salaId, Context.ConnectionId);
            await Clients.Group(salaId).SendAsync("ParticipanteDesconectado", new
            {
                connectionId = Context.ConnectionId,
                salaId
            });
            _connectionSalaMap.Remove(Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    // --- MÉTODOS PRIVADOS DE AYUDA ---
    private string GetUserId()
    {
        var userIdClaim = Context.User?.FindFirst("NameIdentifier")?.Value;
        return userIdClaim ?? Context.ConnectionId;
    }

    private string GetUsername()
    {
        var usernameClaim = Context.User?.FindFirst("Name")?.Value;
        return usernameClaim ?? string.Empty;
    }
}