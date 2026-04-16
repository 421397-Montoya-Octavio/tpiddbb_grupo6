using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WatchParty.Models.DTOs;
using WatchParty.Services;

namespace WatchParty.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalasController : ControllerBase
{
    private readonly ISalaService _service;

    public SalasController(ISalaService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SalaDto>>> GetAll()
    {
        var salas = await _service.GetAllAsync();
        return Ok(salas);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SalaDto>> GetById(string id)
    {
        var sala = await _service.GetByIdAsync(id);
        if (sala == null) return NotFound();
        return Ok(sala);
    }

    [HttpGet("codigo/{codigoAcceso}")]
    public async Task<ActionResult<SalaDto>> GetByCodigo(string codigoAcceso)
    {
        var sala = await _service.GetByCodigoAccesoAsync(codigoAcceso);
        if (sala == null) return NotFound();
        return Ok(sala);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<SalaDto>> Create([FromBody] CreateSalaDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var created = await _service.CreateAsync(userId, dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<SalaDto>> Update(string id, [FromBody] UpdateSalaDto dto)
    {
        var updated = await _service.UpdateAsync(id, dto);
        if (updated == null) return NotFound();
        return Ok(updated);
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