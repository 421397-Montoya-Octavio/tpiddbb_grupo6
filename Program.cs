using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using WatchParty.Data;
using WatchParty.Data.Repositories;
using WatchParty.Hubs;
using WatchParty.Services;

var builder = WebApplication.CreateBuilder(args);

// --- CONFIGURACIÓN CRÍTICA PARA RAILWAY ---
// Esto permite que el servidor use el puerto que Railway le asigne dinámicamente
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://*:{port}");

// --- Servicios y Controladores ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- MongoDB ---
builder.Services.AddSingleton<IConnectionStringProvider, ConfigurationConnectionStringProvider>();
builder.Services.AddSingleton<IMongoDbContext, MongoDbContext>();
builder.Services.AddSingleton<MongoDbContext>(sp => (MongoDbContext)sp.GetRequiredService<IMongoDbContext>());

// --- Inyección de Dependencias (Ajustado a los nombres de este proyecto) ---
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<ISalaRepository, SalaRepository>();
builder.Services.AddScoped<IPeliculaRepository, PeliculaRepository>();
builder.Services.AddScoped<IVotacionRepository, VotacionRepository>();
builder.Services.AddScoped<IMensajeChatRepository, MensajeChatRepository>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<ISalaService, SalaService>();
builder.Services.AddSingleton<IRedisService, RedisService>();
builder.Services.AddScoped<IVotacionService, VotacionService>();
builder.Services.AddScoped<IPeliculaService, PeliculaService>();
builder.Services.AddScoped<IMensajeChatService, MensajeChatService>();

// --- SignalR con Redis Backplane (Para tus 100 usuarios) ---
var redisUrl = builder.Configuration.GetConnectionString("Redis");
builder.Services
    .AddSignalR()
    .AddStackExchangeRedis(redisUrl!, options => {
        options.Configuration.ChannelPrefix = RedisChannel.Literal("WatchPartyChat");
    });

// --- JWT Authentication ---
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// --- CORS (Habilitado para tu GitHub Pages) ---
builder.Services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy => {
        policy.WithOrigins("https://421397-montoya-octavio.github.io")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// --- Middleware Pipeline ---
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

// Inicialización de Redis antes de arrancar
var redisService = app.Services.GetRequiredService<IRedisService>();
await redisService.Inicializar();

app.Run();

internal sealed class ConfigurationConnectionStringProvider : IConnectionStringProvider
{
    private readonly IConfiguration _configuration;

    public ConfigurationConnectionStringProvider(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GetConnectionString()
    {
        return _configuration.GetConnectionString("MongoDB")
            ?? throw new InvalidOperationException("Connection string 'MongoDB' is not configured.");
    }

    public string GetDatabaseName()
    {
        return _configuration["DatabaseName"]
            ?? throw new InvalidOperationException("DatabaseName is not configured.");
    }
}
