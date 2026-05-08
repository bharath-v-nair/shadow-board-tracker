using System.Text.Json.Serialization;

namespace TrackerAPI.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum IncidentStatus
    {
        Open,
        PendingReview,
        Resolved
    }
}
