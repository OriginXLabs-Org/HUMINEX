namespace Huminex.BuildingBlocks.Contracts.Api;

public sealed record ApiEnvelope<T>(T Data, string TraceId);
