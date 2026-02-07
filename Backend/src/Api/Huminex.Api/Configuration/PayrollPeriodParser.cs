namespace Huminex.Api.Configuration;

public static class PayrollPeriodParser
{
    public static bool TryParse(string period, out int year, out int month)
    {
        year = 0;
        month = 0;
        if (string.IsNullOrWhiteSpace(period))
        {
            return false;
        }

        var segments = period.Split('-', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (segments.Length != 2)
        {
            return false;
        }

        if (!int.TryParse(segments[0], out year) || !int.TryParse(segments[1], out month))
        {
            return false;
        }

        return year is >= 2000 and <= 2200 && month is >= 1 and <= 12;
    }

    public static string ToPeriod(int year, int month) => $"{year:D4}-{month:D2}";
}
