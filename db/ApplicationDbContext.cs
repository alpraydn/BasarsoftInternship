using Microsoft.EntityFrameworkCore;
using PointApi.Models;

namespace PointApi.Db
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<Point> Points { get; set; }
    }
}
