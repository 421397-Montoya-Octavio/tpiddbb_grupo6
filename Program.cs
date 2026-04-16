using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using WatchParty.Data;
using WatchParty.Data.Repositories;
using WatchParty.Services;
using StackExchange.Redis; // Necesario para el chat

var builder = WebApplication.CreateBuilder(args);

// --- 1. CONFIGURACIÓN PARA RAILWAY (PUERTO DINÁMICO) ---
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://*:{port}");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "WatchParty", Version = "v1" });
});

// --- 2. BASE DE DATOS (Adaptado a la lógica de tu grupo) ---
var mongoConnectionString = builder.Configuration.GetConnectionString("MongoDB") ?? builder.Configuration.GetSection("ConnectionStrings:MongoDB").Value ?? "mongodb://localhost:27017";
var mongoDatabaseName = builder.Configuration["DatabaseName"] ?? "WatchParty";

builder.Services.AddSingleton<IConnectionStringProvider>(new ConnectionStringProvider(mongoConnectionString, mongoDatabaseName));
builder.Services.AddSingleton<MongoDbContext>(); // Inyectamos la clase directa como piden tus repositorios

// --- 3. REPOSITORIOS Y SERVICIOS ---
builder.Services.AddSingleton<IRedisService, RedisService>();

builder.Services.AddScoped<IPeliculaRepository, PeliculaRepository>();
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<ISalaRepository, SalaRepository>();
builder.Services.AddScoped<IMensajeChatRepository, MensajeChatRepository>();
builder.Services.AddScoped<IVotacionRepository, VotacionRepository>();

builder.Services.AddScoped<IPeliculaService, PeliculaService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<ISalaService, SalaService>();
builder.Services.AddScoped<IMensajeChatService, MensajeChatService>();
builder.Services.AddScoped<IVotacionService, VotacionService>();

// --- 4. SIGNALR CON REDIS (Para aguantar a todos los usuarios) ---
var redisUrl = builder.Configuration.GetSection("ConnectionStrings:Redis").Value;
if (!string.IsNullOrEmpty(redisUrl) && redisUrl.Contains(".upstash.io")) {
    builder.Services.AddSignalR().AddStackExchangeRedis(redisUrl, options => {
        options.Configuration.ChannelPrefix = "WatchPartyChat";
    });
} else {
    builder.Services.AddSignalR();
}

// --- 5. SEGURIDAD (JWT) ---
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "WatchParty",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "WatchParty",
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "WatchPartySecretKey12345678901234567890"))
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chatHub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// --- 6. CORS (Habilitamos tu frontend público) ---
builder.Services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy => {
        policy.WithOrigins("http://127.0.0.1:5500", "http://localhost:3000", "https://421397-montoya-octavio.github.io") 
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "WatchParty API v1");
});

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<WatchParty.Hubs.ChatHub>("/chatHub");

var redisService = app.Services.GetRequiredService<IRedisService>();
await redisService.Inicializar();

app.Run();

public class ConnectionStringProvider : IConnectionStringProvider
{
    private readonly string _connectionString;
    private readonly string _databaseName;

    public ConnectionStringProvider(string connectionString, string databaseName)
    {
        _connectionString = connectionString;
        _databaseName = databaseName;
    }

    public string GetConnectionString() => _connectionString;
    public string GetDatabaseName() => _databaseName;
}