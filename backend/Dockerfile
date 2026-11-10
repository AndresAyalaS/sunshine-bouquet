FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiamos primero los .csproj para aprovechar la caché de restore
COPY Directory.Build.props ./
COPY backend/src/SunshineBouquet.Domain/*.csproj backend/src/SunshineBouquet.Domain/
COPY backend/src/SunshineBouquet.Application/*.csproj backend/src/SunshineBouquet.Application/
COPY backend/src/SunshineBouquet.Infrastructure/*.csproj backend/src/SunshineBouquet.Infrastructure/
COPY backend/src/SunshineBouquet.Api/*.csproj backend/src/SunshineBouquet.Api/
RUN dotnet restore backend/src/SunshineBouquet.Api/SunshineBouquet.Api.csproj

COPY backend/src backend/src
RUN dotnet publish backend/src/SunshineBouquet.Api/SunshineBouquet.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "SunshineBouquet.Api.dll"]
