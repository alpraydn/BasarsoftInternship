using PointApi.Models;

namespace PointApi.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IRepository<Point> Points { get; }
        Task<int> SaveChangesAsync();
    }
}
