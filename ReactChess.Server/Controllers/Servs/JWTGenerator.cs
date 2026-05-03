using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ReactChess.Server.Models;
using System.Text;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace ReactChess.Server.Controllers.Servs
{
    public class JWTGenerator
    {
        private readonly IConfiguration _configuration;
        public JWTGenerator(IConfiguration configuration)
        {
           _configuration = configuration;
        }
        public string Generate(Account account)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]));
            List<Claim> claims = new List<Claim>()
            {
                new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
                new Claim(ClaimTypes.Name, account.Login),
                new Claim(ClaimTypes.Email, account.Email),
                new Claim(ClaimTypes.Role, account.IsAdmin?"Admin":"User")
            };
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(6), // Время жизни токена
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"],
                SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature)
            };
            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }
    }
}
