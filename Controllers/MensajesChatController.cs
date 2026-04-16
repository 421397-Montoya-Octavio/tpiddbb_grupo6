using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WatchParty.Models.DTOs;
using WatchParty.Services;

namespace WatchParty.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MensajesChatController : ControllerBase
{
    private readonly IMensajeChatService _service;

    public MensajesChatController(IMensajeChatService service)
    {
        _service = service;
    }

    [HttpGet("sala/{salaId}")]
    public async Task<ActionResult<IEnumerable<MensajeChatDto>>> GetBySalaId(string salaId)
    {
        var mensajes = await _service.GetBySalaIdAsync(salaId);
        return Ok(mensajes);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<MensajeChatDto>> Create([FromBody] CreateMensajeChatDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new InvalidOperationException("Usuario no autenticado");
        var username = User.FindFirstValue(ClaimTypes.Name) ?? "Anonimo";

        var created = await _service.CreateAsync(userId, username, dto);
        return CreatedAtAction(nameof(GetBySalaId), new { salaId = dto.SalaId }, created);
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<ActionResult> Delete(string id)
    {
        var result = await _service.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}