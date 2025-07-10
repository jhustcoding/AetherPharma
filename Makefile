# Pharmacy Backend Makefile

# Variables
BINARY_NAME=pharmacy-backend
DOCKER_IMAGE=pharmacy-backend
DOCKER_TAG=latest
PORT=8080

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod

# Build parameters
BUILD_DIR=build
MAIN_PATH=./cmd/server/main.go

.PHONY: all build clean test coverage deps run dev docker help

# Default target
all: clean deps test build

## Build the application
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 GOOS=linux $(GOBUILD) -a -installsuffix cgo -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

## Build for current OS
build-local:
	@echo "Building $(BINARY_NAME) for local OS..."
	@mkdir -p $(BUILD_DIR)
	$(GOBUILD) -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

## Clean build artifacts
clean:
	@echo "Cleaning..."
	$(GOCLEAN)
	@rm -rf $(BUILD_DIR)
	@rm -rf coverage.out
	@echo "Clean complete"

## Download dependencies
deps:
	@echo "Downloading dependencies..."
	$(GOMOD) download
	$(GOMOD) tidy
	@echo "Dependencies updated"

## Run tests
test:
	@echo "Running tests..."
	$(GOTEST) -v ./...

## Run tests with coverage
coverage:
	@echo "Running tests with coverage..."
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

## Run the application locally
run: build-local
	@echo "Starting $(BINARY_NAME) on port $(PORT)..."
	./$(BUILD_DIR)/$(BINARY_NAME)

## Run the application in development mode
dev:
	@echo "Starting development server..."
	@echo "Watching for changes..."
	air -c .air.toml || $(GOCMD) run $(MAIN_PATH)

## Build Docker image
docker-build:
	@echo "Building Docker image..."
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo "Docker image built: $(DOCKER_IMAGE):$(DOCKER_TAG)"

## Run Docker container
docker-run: docker-build
	@echo "Running Docker container..."
	docker run -p $(PORT):$(PORT) --name $(BINARY_NAME) $(DOCKER_IMAGE):$(DOCKER_TAG)

## Stop and remove Docker container
docker-stop:
	@echo "Stopping Docker container..."
	docker stop $(BINARY_NAME) || true
	docker rm $(BINARY_NAME) || true

## Start Docker Compose services
docker-up:
	@echo "Starting Docker Compose services..."
	docker-compose up -d
	@echo "Services started. API available at http://localhost:$(PORT)"

## Stop Docker Compose services
docker-down:
	@echo "Stopping Docker Compose services..."
	docker-compose down

## View Docker Compose logs
docker-logs:
	docker-compose logs -f

## Setup development environment
setup-dev:
	@echo "Setting up development environment..."
	@cp .env.example .env
	@echo "Please edit .env file with your configuration"
	@echo "Installing Air for hot reload..."
	$(GOGET) -u github.com/cosmtrek/air
	@echo "Development environment setup complete"

## Generate secure keys for production
generate-keys:
	@echo "Generating secure keys..."
	@echo "JWT Secret (add to .env as JWT_SECRET):"
	@openssl rand -base64 32
	@echo ""
	@echo "Encryption Key (add to .env as ENCRYPTION_KEY):"
	@openssl rand -hex 16
	@echo ""

## Format code
fmt:
	@echo "Formatting code..."
	$(GOCMD) fmt ./...

## Lint code
lint:
	@echo "Running linter..."
	golangci-lint run ./...

## Security scan
security:
	@echo "Running security scan..."
	gosec ./...

## Check for updates
check-updates:
	@echo "Checking for module updates..."
	$(GOCMD) list -u -m all

## Database migration up
migrate-up:
	@echo "Running database migrations..."
	migrate -path migrations -database "postgresql://pharmacy_user:pharmacy_password@localhost:5432/pharmacy_db?sslmode=disable" up

## Database migration down
migrate-down:
	@echo "Rolling back database migrations..."
	migrate -path migrations -database "postgresql://pharmacy_user:pharmacy_password@localhost:5432/pharmacy_db?sslmode=disable" down

## Create new migration
migrate-create:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir migrations $$name

## Backup database
backup-db:
	@echo "Backing up database..."
	@mkdir -p backups
	pg_dump -h localhost -U pharmacy_user -d pharmacy_db > backups/pharmacy_db_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Database backup complete"

## Install production dependencies
install-prod:
	@echo "Installing production dependencies..."
	sudo apt-get update
	sudo apt-get install -y postgresql-client redis-tools curl
	@echo "Production dependencies installed"

## Deploy to production (basic)
deploy:
	@echo "Deploying to production..."
	@echo "Building production binary..."
	$(MAKE) build
	@echo "Uploading binary..."
	# Add your deployment commands here
	@echo "Deployment complete"

## Health check
health:
	@echo "Checking application health..."
	curl -f http://localhost:$(PORT)/health || echo "Health check failed"

## Load test (requires vegeta)
load-test:
	@echo "Running load test..."
	echo "GET http://localhost:$(PORT)/health" | vegeta attack -duration=30s -rate=10 | vegeta report

## Performance profile
profile:
	@echo "Running performance profile..."
	$(GOCMD) test -bench=. -benchmem -cpuprofile=cpu.prof -memprofile=mem.prof ./...

## View CPU profile
profile-cpu:
	$(GOCMD) tool pprof cpu.prof

## View memory profile
profile-mem:
	$(GOCMD) tool pprof mem.prof

## Install development tools
install-tools:
	@echo "Installing development tools..."
	$(GOGET) github.com/cosmtrek/air
	$(GOGET) github.com/golangci/golangci-lint/cmd/golangci-lint
	$(GOGET) github.com/securecodewarrior/gosec/v2/cmd/gosec
	$(GOGET) github.com/golang-migrate/migrate/v4/cmd/migrate
	@echo "Development tools installed"

## Documentation
docs:
	@echo "Generating API documentation..."
	swag init -g cmd/server/main.go -o docs/
	@echo "Documentation generated in docs/"

## View documentation
docs-serve:
	@echo "Serving documentation at http://localhost:8081"
	cd docs && python3 -m http.server 8081

## Full CI pipeline
ci: clean deps fmt lint security test coverage build
	@echo "CI pipeline complete"

## Help
help:
	@echo "Available commands:"
	@echo ""
	@echo "  Development:"
	@echo "    dev          - Run in development mode with hot reload"
	@echo "    run          - Build and run locally"
	@echo "    test         - Run tests"
	@echo "    coverage     - Run tests with coverage report"
	@echo "    fmt          - Format code"
	@echo "    lint         - Run linter"
	@echo "    security     - Run security scan"
	@echo ""
	@echo "  Build & Deploy:"
	@echo "    build        - Build for Linux"
	@echo "    build-local  - Build for current OS"
	@echo "    clean        - Clean build artifacts"
	@echo "    deploy       - Deploy to production"
	@echo ""
	@echo "  Docker:"
	@echo "    docker-build - Build Docker image"
	@echo "    docker-run   - Run Docker container"
	@echo "    docker-up    - Start Docker Compose services"
	@echo "    docker-down  - Stop Docker Compose services"
	@echo "    docker-logs  - View Docker Compose logs"
	@echo ""
	@echo "  Database:"
	@echo "    migrate-up   - Run database migrations"
	@echo "    migrate-down - Rollback migrations"
	@echo "    backup-db    - Backup database"
	@echo ""
	@echo "  Setup:"
	@echo "    setup-dev    - Setup development environment"
	@echo "    deps         - Download dependencies"
	@echo "    generate-keys- Generate secure keys"
	@echo "    install-tools- Install development tools"
	@echo ""
	@echo "  Monitoring:"
	@echo "    health       - Check application health"
	@echo "    load-test    - Run load test"
	@echo "    profile      - Run performance profile"
	@echo ""
	@echo "  Documentation:"
	@echo "    docs         - Generate API documentation"
	@echo "    docs-serve   - Serve documentation"
	@echo ""
	@echo "  CI/CD:"
	@echo "    ci           - Run full CI pipeline"
	@echo "    help         - Show this help message"