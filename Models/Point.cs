namespace PointApi.Models
{
    public class Point
    {
        public long Id { get; set; }
        public required string Wkt { get; set; }
        public required string Name { get; set; }
    }
}
