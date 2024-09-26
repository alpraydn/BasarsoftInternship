namespace PointApi.Models
{
    public class Response<T>
    {
        public required T? Value { get; set; }
        public bool Status { get; set; }
        public required string Message { get; set; } = string.Empty;
    }
}