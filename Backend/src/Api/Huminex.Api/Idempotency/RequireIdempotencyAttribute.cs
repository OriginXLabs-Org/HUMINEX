using Microsoft.AspNetCore.Mvc;

namespace Huminex.Api.Idempotency;

[AttributeUsage(AttributeTargets.Method)]
public sealed class RequireIdempotencyAttribute : TypeFilterAttribute
{
    public RequireIdempotencyAttribute() : base(typeof(IdempotencyFilter))
    {
    }
}
