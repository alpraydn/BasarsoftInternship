using Microsoft.AspNetCore.Mvc; 
using PointApi.Interfaces; 
using PointApi.Models; 
using System.Collections.Generic; 
using System.Threading.Tasks; 

namespace PointApi.Controllers 
{
    [Route("api/[controller]")]
    [ApiController]
    public class PointsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public PointsController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        public async Task<ActionResult<Response<IEnumerable<Point>>>> GetAllAsync()
        {
            var points = await _unitOfWork.Points.GetAllAsync();
            return Ok(new Response<IEnumerable<Point>> { Value = points, Status = true, Message = "Points retrieved successfully." });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Response<Point>>> GetByIdAsync(long id)
        {
            var point = await _unitOfWork.Points.GetByIdAsync(id);
            if (point == null)
            {
                return NotFound(new Response<Point> { Value = null, Status = false, Message = "Point not found." });
            }
            return Ok(new Response<Point> { Value = point, Status = true, Message = "Point retrieved successfully." });
        }

        [HttpPost]
        public async Task<ActionResult<Response<Point>>> AddAsync([FromBody] Point point)
        {
            await _unitOfWork.Points.AddAsync(point);
            await _unitOfWork.SaveChangesAsync();
            return Created($"api/points/{point.Id}", new Response<Point> { Value = point, Status = true, Message = "Point created successfully." });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Response<string>>> UpdateAsync(long id, [FromBody] Point point)
        {
            var existingPoint = await _unitOfWork.Points.GetByIdAsync(id);
            if (existingPoint == null)
            {
                return NotFound(new Response<string> { Value = null, Status = false, Message = "Point not found." });
            }

            existingPoint.Name = point.Name;
            existingPoint.Wkt = point.Wkt; 
            await _unitOfWork.Points.UpdateAsync(existingPoint);
            await _unitOfWork.SaveChangesAsync();

            return Ok(new Response<string> { Value = null, Status = true, Message = "Point updated successfully." });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<Response<string>>> DeleteAsync(long id)
        {
            var existingPoint = await _unitOfWork.Points.GetByIdAsync(id);
            if (existingPoint == null)
            {
                return NotFound(new Response<string> { Value = null, Status = false, Message = "Point not found." });
            }

            await _unitOfWork.Points.DeleteAsync(id);
            await _unitOfWork.SaveChangesAsync();
            return Ok(new Response<string> { Value = null, Status = true, Message = "Point deleted successfully." });
        }
    }
}

