using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WatchParty.Models.DTOs;
using WatchParty.Services;

namespace WatchParty.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PeliculasController : ControllerBase
{
    private readonly IPeliculaService _service;

    public PeliculasController(IPeliculaService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PeliculaDto>>> GetAll()
    {
        var peliculas = await _service.GetAllAsync();
        return Ok(peliculas);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PeliculaDto>> GetById(string id)
    {
        var pelicula = await _service.GetByIdAsync(id);
        if (pelicula == null) return NotFound();
        return Ok(pelicula);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<PeliculaDto>> Create([FromBody] CreatePeliculaDto dto)
    {
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<PeliculaDto>> Update(string id, [FromBody] UpdatePeliculaDto dto)
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