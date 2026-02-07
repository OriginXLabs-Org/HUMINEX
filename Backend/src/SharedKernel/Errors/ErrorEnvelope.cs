namespace Huminex.SharedKernel.Errors;

public sealed record ErrorEnvelope(
    string Code,
    string Message,
    string TraceId,
    IReadOnlyDictionary<string, string[]>? ValidationErrors = null
);
