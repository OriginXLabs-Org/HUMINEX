using Huminex.SharedKernel.Pagination;

namespace Huminex.Tests.Unit;

public class UnitTest1
{
    [Fact]
    public void PagedResponse_ShouldStorePagingMetadata()
    {
        var response = new PagedResponse<string>(["a", "b"], 2, 10, 25);

        Assert.Equal(2, response.Page);
        Assert.Equal(10, response.PageSize);
        Assert.Equal(25, response.TotalCount);
        Assert.Equal(2, response.Items.Count);
    }
}
