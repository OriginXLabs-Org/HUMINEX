using Huminex.Api.Configuration;

namespace Huminex.Tests.Unit;

public sealed class PayrollPeriodParserTests
{
    [Theory]
    [InlineData("2026-01", 2026, 1)]
    [InlineData("2200-12", 2200, 12)]
    public void TryParse_ShouldParse_ValidPeriods(string period, int expectedYear, int expectedMonth)
    {
        var ok = PayrollPeriodParser.TryParse(period, out var year, out var month);

        Assert.True(ok);
        Assert.Equal(expectedYear, year);
        Assert.Equal(expectedMonth, month);
    }

    [Theory]
    [InlineData("")]
    [InlineData("2026")]
    [InlineData("1999-12")]
    [InlineData("2201-01")]
    [InlineData("2026-00")]
    [InlineData("2026-13")]
    [InlineData("invalid")]
    public void TryParse_ShouldReject_InvalidPeriods(string period)
    {
        var ok = PayrollPeriodParser.TryParse(period, out _, out _);

        Assert.False(ok);
    }

    [Fact]
    public void ToPeriod_ShouldFormat_AsYearMonth()
    {
        var period = PayrollPeriodParser.ToPeriod(2026, 3);

        Assert.Equal("2026-03", period);
    }
}
