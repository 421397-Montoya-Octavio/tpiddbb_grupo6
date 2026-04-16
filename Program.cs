using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using WatchParty.Data;
using WatchParty.Data.Repositories;
using WatchParty.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "WatchParty", Version = "v1" });
});

var mongoConnectionString = builder.Configuration.GetConnectionString("MongoDB") ?? "mongodb://localhost:27017";
var mongoDatabaseName = builder.Configuration["DatabaseName"] ?? "WatchParty";

builder.Services.AddSingleton<IConnectionStringProvider>(new ConnectionStringProvider(mongoConnectionString, mongoDatabaseName));
builder.Services.AddSingleton<MongoDbContext>();

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

builder.Services.AddSignalR();

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
});

builder.Services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy => {
        policy.WithOrigins("http://127.0.0.1:5500") 
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

//app.UseHttpsRedirection();
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