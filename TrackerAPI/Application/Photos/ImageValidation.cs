namespace TrackerAPI.Application.Photos
{
    /// <summary>
    /// Validates uploaded images by BOTH declared content-type AND magic bytes (file signature).
    /// Checking only the extension or the client-supplied Content-Type is a classic upload flaw:
    /// an attacker renames evil.exe to evil.jpg and sets image/jpeg. The first few bytes of the
    /// actual content are far harder to spoof, so we verify the real format before storing.
    /// </summary>
    public static class ImageValidation
    {
        public const long MaxBytes = 5 * 1024 * 1024; // 5 MB

        // Allowed content-type -> canonical file extension.
        private static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = "jpg",
            ["image/png"] = "png",
            ["image/webp"] = "webp",
        };

        public sealed record Result(bool IsValid, string? Error, string Extension = "");

        public static Result Validate(byte[] content, string? contentType)
        {
            if (content is null || content.Length == 0)
                return new Result(false, "Empty file.");

            if (content.Length > MaxBytes)
                return new Result(false, $"File exceeds the {MaxBytes / (1024 * 1024)}MB limit.");

            if (string.IsNullOrWhiteSpace(contentType) || !AllowedTypes.TryGetValue(contentType, out var ext))
                return new Result(false, "Unsupported file type. Allowed: JPEG, PNG, WebP.");

            if (!MagicBytesMatch(content, contentType))
                return new Result(false, "File content does not match its declared type.");

            return new Result(true, null, ext);
        }

        private static bool MagicBytesMatch(byte[] b, string contentType)
        {
            switch (contentType.ToLowerInvariant())
            {
                case "image/jpeg":
                    // JPEG starts with FF D8 FF
                    return b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF;
                case "image/png":
                    // PNG: 89 50 4E 47 0D 0A 1A 0A
                    return b.Length >= 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
                        && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A;
                case "image/webp":
                    // WebP: "RIFF" .... "WEBP"
                    return b.Length >= 12 && b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46
                        && b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50;
                default:
                    return false;
            }
        }
    }
}
