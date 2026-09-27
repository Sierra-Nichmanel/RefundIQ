# RefundIQ

### AI-Assisted Refund Management System

RefundIQ is a full-stack refund management platform that combines deterministic refund policy enforcement with AI-assisted classification and explanations. It provides customers with a refund request interface and administrators with a secure dashboard for reviewing and managing refund requests.

Built as a full-stack engineering take-home project for WORKNOON.

## Features

### Customer Portal

* Submit refund requests using an order number, customer email, and reason.
* Receive a refund decision based on the configured refund policy.
* View the outcome and explanation of a refund request.

### Refund Policy Engine

* Automatically approves eligible refund requests.
* Denies requests for final-sale items or orders outside the refund window.
* Escalates high-value or suspicious requests for administrator review.
* Uses deterministic policy rules as the source of truth for refund decisions.

### AI Integration

* Uses OpenAI to classify refund request reasons and provide supporting explanations.
* Keeps final refund decisions separate from AI-generated classifications.
* Includes a fallback when the OpenAI API key is unavailable or the service fails.
* Treats suspicious or prompt-injection-style requests as cases requiring escalation.

### Admin Dashboard

* Secure administrator login and logout.
* View, search, and filter refund requests.
* Inspect individual refund details and review history.
* Review escalated requests with approval or denial decisions and mandatory notes.
* Export refund records to CSV.

### Security and Auditability

* Password hashing with bcrypt.
* JWT-based authentication using HTTP-only cookies.
* Role-based access control for administrative operations.
* Server-side input validation using Zod.
* Database-backed audit logs for refund decisions and administrative reviews.
* Helmet security headers and configured CORS.

## Technology Stack

| Layer              | Technologies                     |
| ------------------ | -------------------------------- |
| Frontend           | React, Vite, TypeScript          |
| Backend            | Node.js, Express, TypeScript     |
| Database           | PostgreSQL                       |
| ORM and migrations | Prisma                           |
| Validation         | Zod                              |
| AI                 | OpenAI API                       |
| Authentication     | JWT, bcryptjs, HTTP-only cookies |
| Infrastructure     | Docker, Docker Compose           |
| CI/CD              | GitHub Actions                   |

## Architecture

RefundIQ uses a frontend/backend architecture with PostgreSQL as its persistent data store.

Customer / Administrator
         |
         v
  React + Vite Frontend
         |
         v
   Express REST API
         |
   +-----+------+
   |            |
   v            v

Policy Engine   OpenAI
|
v
Prisma ORM
|
v
PostgreSQL

The policy engine determines whether a refund is approved, denied, or escalated. AI is used as a supporting classification and explanation layer, not as the authority for refund eligibility.

## Refund Policy

The current implementation applies the following rules:

| Condition                                        | Decision  |
| ------------------------------------------------ | --------- |
| Item is marked final sale                        | Denied    |
| Order is outside the 30-day refund window        | Denied    |
| Suspicious or prompt-injection-style request     | Escalated |
| Refund amount exceeds $500                       | Escalated |
| Item is damaged, broken, or incorrect            | Approved  |
| Other eligible requests within the refund window | Approved  |

Refund amounts and order details are retrieved from the database rather than trusted from customer-submitted values.

Escalated requests require administrator review before they can be finalized.

## Getting Started

### Prerequisites

* Node.js 22 or later
* npm
* Docker and Docker Compose

Docker is required for the complete containerized setup.

### 1. Clone the repository

git clone https://github.com/Sierra-Nichmanel/RefundIQ.git
cd RefundIQ

Replace the placeholder with the actual public GitHub repository URL.

### 2. Configure environment variables

Create a root `.env` file using `.env.example` as a reference.

cp .env.example .env

On Windows PowerShell, you can use:

Copy-Item .env.example .env

Configure the required values in `.env`. These include the PostgreSQL credentials, database connection string, JWT secret, administrator credentials, and OpenAI configuration.

Use a strong, randomly generated JWT secret that meets the application's minimum length requirement.

Do not commit `.env` or expose real credentials in screenshots, logs, or documentation.

### 3. Start the application

From the project root, run:

docker compose up --build -d

The Docker Compose configuration starts PostgreSQL, the backend API, and the frontend.

Database migrations are applied by the backend container during startup.

### 4. Seed the database

Run the seed command:

docker compose exec -T backend npx prisma db seed

The seed script creates fictional customers, orders, and the administrator account using the configured environment variables.

**Warning:** The seed script clears and recreates development data. Only run it against a disposable development or test database.

### 5. Access the application

| Service              | URL                               |
| -------------------- | --------------------------------- |
| Customer portal      | http://localhost:5173             |
| Administrator login  | http://localhost:5173/admin/login |
| Backend health check | http://localhost:5000/api/health  |

Use the administrator email and password configured in your local environment to access the dashboard.

### 6. Stop the application

docker compose down

To remove the development database volume and its data as well:

docker compose down -v

Use the volume-removal command only when you intend to delete the database data.

## API Overview

The backend exposes the following REST endpoints:

| Method | Endpoint                  | Description                | Access        |
| ------ | ------------------------- | -------------------------- | ------------- |
| GET    | `/api/health`             | Health check               | Public        |
| POST   | `/api/auth/login`         | Administrator login        | Public        |
| GET    | `/api/auth/me`            | Current administrator      | Authenticated |
| POST   | `/api/auth/logout`        | Administrator logout       | Authenticated |
| POST   | `/api/refunds`            | Submit a refund request    | Public        |
| GET    | `/api/refunds`            | List refund requests       | Admin         |
| GET    | `/api/refunds/:id`        | Retrieve refund details    | Admin         |
| PATCH  | `/api/refunds/:id/review` | Review an escalated refund | Admin         |

Refund submissions require an order number, customer email, and reason.

Administrator review requests include the decision and review notes. Only eligible escalated requests can be reviewed.

## Testing and Continuous Integration

RefundIQ includes a GitHub Actions workflow that builds and runs the Dockerized application in a hosted Linux environment.

The workflow verifies:

* Docker Compose configuration and image builds.
* PostgreSQL startup and backend/frontend availability.
* Database migrations and test data seeding.
* Refund approval, denial, and escalation scenarios.
* Request validation and customer/order ownership checks.
* Authentication, administrator authorization, and logout.
* Escalated refund review, reviewer attribution, and audit history.

The workflow uses synthetic test data and test-only credentials.

The CI workflow has passed successfully in GitHub Actions.

## Project Structure

RefundIQ/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/
│   └── frontend/
├── .github/
│   └── workflows/
│       └── docker-ci.yml
├── docker-compose.yml
├── .env.example
└── README.md

## Design Decisions

### Deterministic policy enforcement

Refund eligibility is determined by explicit backend policy rules rather than free-form AI output. This provides predictable decisions and makes the rules independently testable.

### AI as an assisting component

The AI service supports classification and explanation. It does not independently determine refund eligibility or override the policy engine.

### Database-backed audit history

Refund requests, administrative decisions, reviewer information, and review notes are persisted for traceability.

### Containerized deployment

Docker Compose provides a consistent way to run the frontend, backend, and database together. GitHub Actions validates the containerized application without requiring Docker Desktop on the developer's local machine.

## Limitations and Future Improvements

Potential areas for further development include:

* Production deployment with managed PostgreSQL and secure secret management.
* Automated API documentation using OpenAPI/Swagger.
* More comprehensive unit, integration, and frontend end-to-end testing.
* Rate limiting and additional abuse-prevention controls.
* Expanded observability, structured logging, and monitoring.
* Configurable refund policies and a more granular administrator permission model.

## Author

Michael Ibangha

Full Stack Developer

Built as a full-stack engineering take-home project for WORKNOON.

## License

This project was developed for evaluation purposes. Add an appropriate open-source license if you intend to distribute it publicly under specific license terms.
