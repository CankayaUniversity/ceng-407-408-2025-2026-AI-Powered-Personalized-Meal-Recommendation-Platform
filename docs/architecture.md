# System Architecture

## Architectural Overview
The system follows a **modular monolithic architecture** inspired by real-world enterprise applications. Backend and frontend are developed as separate modules and communicate through RESTful APIs.

This approach provides:
- Clear separation of concerns
- Easier maintainability
- Reduced complexity compared to microservices
- Academic suitability for a graduation project

## High-Level Architecture
- Web-based client (React)
- Java-based backend (Spring Boot)
- External AI service accessed via REST API
- Relational database for persistent storage

## Backend Architecture
The backend is structured based on principles inspired by **Clean Architecture** and **Domain-Driven Design (DDD)**.

### Backend Modules

backend/
├── infrastructure
│ ├── persistence
│ ├── security
│ └── ai
│
├── domain
│ ├── user
│ ├── ingredient
│ ├── recipe
│ └── nutrition
│
├── application
│ ├── controllers
│ ├── dto
│ └── config
│
└── utilities


### Layer Responsibilities
- **Infrastructure Layer:** Technical concerns such as database configuration and AI API integration.
- **Domain Layer:** Core business logic, entities, and rules.
- **Application Layer:** REST controllers and request handling.
- **Utilities:** Helper components such as data loaders.

## Frontend Architecture
The frontend is implemented as a Single Page Application (SPA) using React.

frontend/
├── src/
│ ├── features
│ ├── shared
│ └── infrastructure


- Feature-based folder structure
- Separation between UI components and API communication
- Responsive and user-focused design

## Design Rationale
This architecture was selected to reflect real-world software engineering practices while keeping the system manageable within academic constraints. It allows future extension without architectural changes.
