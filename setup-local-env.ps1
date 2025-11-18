param (
    [string]$ImageTag
)

Write-Host "Setting up local environment for Lindas Cube Creator..."

# Check if Docker is running
if (!(Get-Process docker -ErrorAction SilentlyContinue)) {
    Write-Warning "Docker Desktop might not be running. Please ensure Docker is started."
}

# Clean up old environment
Write-Host "Cleaning up old environment..."
docker-compose -f docker-compose.offline.yml down -v

# Set IMAGE_TAG environment variable if provided
if ($ImageTag) {
    $env:IMAGE_TAG = $ImageTag
    Write-Host "Using image tag: $ImageTag"
    # If image tag is provided, we pull images instead of building
    Write-Host "Pulling and starting services..."
    docker-compose -f docker-compose.offline.yml up -d
} else {
    Write-Host "No image tag provided. Building from source..."
    # If no image tag, we build
    docker-compose -f docker-compose.offline.yml up -d --build
}

# Wait for API to be healthy
Write-Host "Waiting for API to be ready..."
$retries = 60
while ($retries -gt 0) {
    $id = docker-compose -f docker-compose.offline.yml ps -q api
    if ($id) {
        $health = docker inspect --format='{{.State.Health.Status}}' $id
        if ($health -eq "healthy") {
            Write-Host "`nAPI is healthy."
            break
        }
    }
    Start-Sleep -Seconds 5
    $retries--
    Write-Host -NoNewline "."
}
Write-Host ""

if ($retries -eq 0) {
    Write-Error "API failed to become healthy."
    exit 1
}

# Seed data
Write-Host "Seeding sample data..."
docker-compose -f docker-compose.offline.yml exec -w /app -T api node /app/packages/testing/index.js -i ubd dimensions px-cube hierarchies

Write-Host "Setup complete!"
Write-Host "UI: http://localhost:8080"
Write-Host "API: http://localhost:3000"
Write-Host "Fuseki: http://localhost:3030"
Write-Host "Minio: http://localhost:9000 (Console: http://localhost:9001)"