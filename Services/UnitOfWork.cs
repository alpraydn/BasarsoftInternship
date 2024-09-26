using PointApi.Db; 
using PointApi.Interfaces; 
using PointApi.Models; 
using PointApi.Repositories; 
using System.Threading.Tasks; 
using System; 

namespace PointApi.Services 
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationDbContext _context;
        private IRepository<Point>? _points;

        public UnitOfWork(ApplicationDbContext context)
        {
            _context = context;
        }

        public IRepository<Point> Points => _points ??= new Repository<Point>(_context);

        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
