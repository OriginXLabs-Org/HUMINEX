FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Backend/src ./Backend/src

RUN dotnet restore ./Backend/src/Api/Huminex.Api/Huminex.Api.csproj
RUN dotnet publish ./Backend/src/Api/Huminex.Api/Huminex.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "Huminex.Api.dll"]
