using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WatchParty.Models.DTOs;
using WatchParty.Services;

namespace WatchParty.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VotacionesController : ControllerBase
{
    private readonly IVotacionService _service;

    public VotacionesController(IVotacionService service)
    {
        _service = service;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VotacionDto>> GetById(string id)
    {
        var votacion = await _service.GetByIdAsync(id);
        if (votacion == null) return NotFound();
        return Ok(votacion);
    }

    [HttpGet("sala/{salaId}/activa")]
    public async Task<ActionResult<VotacionDto>> GetActivaBySalaId(string salaId)
    {
        var votacion = await _service.GetActivaBySalaIdAsync(salaId);
        if (votacion == null) return NotFound();
        return Ok(votacion);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<VotacionDto>> Create([FromBody] CreateVotacionDto dto)
    {
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPost("votar")]
    [Authorize]
    public async Task<ActionResult<VotacionDto>> Votar([FromBody] VotarDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new InvalidOperationException("Usuario no autenticado");
        
        var result = await _service.VotarAsync(userId, dto);
        if (result == null) return BadRequest(new { message = "No se pudo procesar el voto" });
        return Ok(result);
    }

    [HttpPost("{id}/finalizar")]
    [Authorize]
    public async Task<ActionResult<VotacionDto>> Finalizar(string id)
    {
        var result = await _service.FinalizarVotacionAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }
}