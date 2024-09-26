using PointApi.Interfaces;
using PointApi.Models;
using PointApi.Db;
using PointApi.Repositories;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;

namespace PointApi.Services
{
    public class PointService : Repository<Point>
    {
        public PointService(ApplicationDbContext context) : base(context)
        {
        }
    }
}   