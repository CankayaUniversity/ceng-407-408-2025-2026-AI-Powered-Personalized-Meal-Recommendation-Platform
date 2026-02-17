# AI-Powered Personalized Meal Recommendation Platform

This project is a web-based application that provides personalized meal and diet recommendations based on users’ available ingredients, dietary preferences, and nutrition goals. The system aims to combine recipe management, nutritional analysis, and AI-assisted recommendations within a single integrated platform.

## Project Motivation
Many existing meal recommendation platforms rely on static recipe lists or simple filtering mechanisms. Nutritional analysis is often handled by separate tools, and personalization is usually limited. This project aims to bring these features together in a unified system that adapts recommendations according to individual user profiles.

## Key Features
- User profile management (diet goals, liked/disliked foods)
- Ingredient-based recipe recommendations
- Nutritional value calculation (calories, protein, fat, carbohydrates)
- AI-assisted personalized meal and diet suggestions
- Web-based, modular and extensible architecture

## Technology Stack
### Backend
- Java
- Spring Boot
- RESTful API architecture
- Maven / Gradle for build management

### Frontend
- React.js
- JavaScript
- Axios for API communication

### Database
- PostgreSQL

### AI Integration
- Prompt-based communication with an online AI service
- AI is accessed via REST API
- All prompt construction and result processing are handled in the backend

## Project Structure
- `backend/`: Java Spring Boot backend application
- `frontend/`: React-based frontend application
- `docs/`: Architecture and AI design documentation

## Development and Deployment (Backend)

### Prerequisites
- Docker (for PostgreSQL)
- Java 21+

### Local Setup
1. Create `backend/modules/03-application/src/main/resources/application.yml` using the `.example` file.
2. Ensure your PostgreSQL is running (e.g., in Docker at port 54320).
3. (Optional) Set `app.seed.enabled: true` in your `application.yml` for initial sample data.

### Build and Package
To build the entire project and generate an executable JAR:
```bash
./gradlew clean build
```
The executable "Fat JAR" will be located at:
`backend/modules/03-application/build/libs/03-application-1.0-SNAPSHOT.jar`

To build the package quickly without running tests:
```bash
./gradlew clean bootJar -x test
```

### Running the Application
```bash
java -jar backend/modules/03-application/build/libs/03-application-1.0-SNAPSHOT.jar
```


## Project Scope
This project is developed as a senior graduation project (CENG 407 & CENG 408) and focuses on software architecture, system design, and applied AI integration rather than large-scale data science or model training.
