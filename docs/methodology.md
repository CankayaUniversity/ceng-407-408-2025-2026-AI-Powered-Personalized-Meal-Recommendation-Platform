# Methodology

## 1. Introduction

This document describes the implemented methodology of the **AI-Powered Personalized Meal Recommendation Platform**. The project has evolved from an initial recommendation-system concept into a full-stack meal planning platform with authentication, inventory management, recipe management, nutrition tracking, AI-assisted recommendations, administrative workflows, and data processing utilities.

The methodology reflects the current architecture and implementation: a modular Spring Boot backend, a React and TypeScript frontend, a relational persistence model, external AI provider integration, and supporting Python utilities for recipe and ingredient data preparation.

---

## 2. Project Scope and Objectives

### 2.1 Implemented Objectives

The platform supports the following core objectives:

- **User profile management:** Users maintain personal profile data, diet type, dietary goal, allergies, disliked ingredients, body metrics, activity level, and daily calorie target.
- **Authentication and authorization:** The application supports Keycloak-based authentication, JWT resource-server validation, role-based access control, and a guest-auth fallback for local frontend operation.
- **Inventory management:** Users manage inventory groups, inventory items, quantities, units, group members, invitations, shopping lists, and stock deduction during consumption.
- **Recipe management:** The system stores recipes, ingredients, nutrition data, recipe ingredients, ratings, favorites, statuses, versions, and recipe images.
- **AI-powered recipe and menu recommendations:** The recommendation engine combines deterministic ranking with optional AI provider calls to generate personalized suggestions and explanations.
- **Nutrition and consumption tracking:** Users can log consumed recipes or custom food entries, preview nutritional impact, view history, and analyze calorie and macronutrient trends.
- **Administrative management:** Admin users can manage users, recipes, ingredients, recipe approval flows, and test inventory setup.
- **Dataset preparation:** Python utilities clean, normalize, process, and import ingredient, recipe, nutrition, and unit conversion datasets.

### 2.2 Current Scope

The current scope includes:

- **Recommendation methodology:** A hybrid ranking approach based on inventory match, user preferences, cravings, nutritional goals, recent consumption history, diversity, rating, preparation time, and AI-generated explanations.
- **Nutrition methodology:** Nutrition totals are calculated from ingredient nutrition records and recipe ingredient quantities, with unit conversion support for grams and household units.
- **Application architecture:** A modular backend separates infrastructure, domain, application, test support, and utility concerns. The frontend uses feature-based React modules, typed services, dependency injection, context providers, and reusable UI components.
- **Security and integration:** Keycloak JWT validation protects authenticated routes, admin routes require role checks, AI provider calls support user-provided encrypted API keys, and MinIO handles file storage.
- **Evaluation:** The project uses JUnit, Mockito, Spring tests, Testcontainers, repository tests, controller tests, mapper tests, utility tests, and frontend build/lint checks.

---

## 3. System Architecture Methodology

### 3.1 Backend Architecture

The backend follows a layered, modular Spring Boot architecture:

- **Infrastructure module:** External integrations such as AI providers, WebClient-based clients, MinIO storage, QueryDSL repository support, and test infrastructure.
- **Domain module:** Core business entities, repositories, services, recommendation strategies, nutrition calculation, inventory operations, consumption tracking, notifications, and user logic.
- **Application module:** REST controllers, DTOs, mappers, security configuration, exception handling, i18n support, and orchestration services.
- **Utilities module:** Shared utility logic and Python data-processing scripts for preparing recipe and ingredient datasets.

This structure keeps domain logic independent from external service details. For example, recommendation logic depends on a `PromptEngine` abstraction rather than directly coupling to a specific AI provider.

### 3.2 Frontend Architecture

The frontend is implemented with React, TypeScript, Vite, React Router, Axios, i18next, and Keycloak JS.

The UI is organized by feature areas:

- `dashboard`
- `recommendations`
- `inventory`
- `consumption`
- `recipes`
- `profile`
- `notifications`
- `admin`
- `about`
- `landing-page`

Shared infrastructure includes:

- Authentication context and service abstraction
- Service registry and dependency injection
- Axios HTTP client with bearer-token interceptor
- Theme, toast, and definition contexts
- Reusable loading, error, empty-state, modal, and unit-converter components

### 3.3 Security Architecture

The backend uses Spring Security as an OAuth2 resource server. JWT tokens are validated against the configured issuer and JWK set. Public endpoints are explicitly allowed, authenticated endpoints require valid JWTs, and admin endpoints require the `ADMIN` role.

The frontend chooses between `KeycloakAuthService` and `GuestAuthService` based on configuration. Protected routes are enforced through route guards, and admin screens are protected by role-aware private routes.

---

## 4. Recommendation System Methodology

### 4.1 Recommendation Strategy

The implemented recommendation system uses a hybrid methodology:

1. Fetch recipes that are safe for the user based on diet type and allergies.
2. Calculate nutrition data for candidate recipes.
3. Score candidates using deterministic ranking signals.
4. Use the selected AI provider when available to generate personalized explanations or menu choices.
5. Fall back to backend ranking when the user selects the free model or when the AI service is unavailable.

This approach avoids full dependence on AI output. The backend always remains capable of producing recommendations through deterministic scoring.

### 4.2 Recipe Recommendation Scoring

Individual recipe recommendations are ranked using weighted signals:

- **Inventory match:** Measures how well a recipe matches the user's available ingredients.
- **Recipe rating:** Gives a controlled boost to recipes with user ratings.
- **Taste preference:** Penalizes recipes containing disliked ingredients.
- **Craving match:** Rewards recipes whose title, category, instructions, or ingredients match the user's current craving.
- **Nutrition match:** Scores recipes against the user's calorie target and dietary goal.
- **Cook history:** Includes popularity and cook-count signals.
- **Preparation time:** Rewards practical recipes with shorter preparation time.
- **Diversity:** Penalizes recipes recently consumed or recently recommended and cooked.

The final output is limited to a focused set of recommended recipes, each with an insight explaining why it fits the user's context.

### 4.3 Menu Recommendation Scoring

Menu recommendations use category-based candidate pools. The user selects recipe categories such as soups, main dishes, or desserts, and the system builds candidate lists for each selected category.

Candidate pools are ranked using:

- Inventory alignment
- Palate and craving relevance
- Nutrition match
- Diversity from recent consumption and recommendation history
- Popularity and preparation-time balance

The system returns three menu alternatives. If AI is available, it selects combinations from the validated candidate pool and returns JSON-only structured choices. If AI is unavailable or the free model is selected, the backend assembles menus from ranked candidates.

### 4.4 AI Provider Integration

The platform supports multiple AI providers through a common provider interface:

- `FREE` mode for no external AI call
- `OPENAI`
- `GEMINI`
- `CLAUDE`
- Generic OpenAI-compatible provider support

The frontend allows users to provide API keys for paid providers. These keys are encrypted in browser storage before being sent to the backend, and the backend decrypts them before calling the selected provider.

AI responses are parsed as structured JSON. Invalid, empty, or unavailable AI responses trigger fallback recommendation generation.

### 4.5 Explainability

Recommendation explanations are generated from both algorithmic and AI signals. The explanation may include:

- Matching inventory ingredients
- Missing ingredients
- Diet type and dietary goal compatibility
- Calorie target alignment
- Protein or low-calorie advantages
- Preparation time
- User rating and popularity
- Craving relevance
- Diversity from recent history

This supports user trust by showing why a recipe or menu was selected.

---

## 5. Nutrition and Consumption Methodology

### 5.1 Nutritional Value Calculation

Recipe nutrition is calculated from ingredient-level nutrition records. The system aggregates:

- Calories
- Protein
- Carbohydrates
- Fat

Ingredient nutrition values are normalized per 100 grams. Recipe ingredient quantities are converted to grams when possible, using ingredient-specific unit conversion data.

### 5.2 Unit Conversion

The platform supports unit conversion through an application-level unit converter. This allows inventory and recipes to use practical units while still supporting gram-based nutrition calculation.

Supported workflows include:

- Converting recipe ingredient amounts to grams
- Converting inventory quantities between compatible units
- Previewing conversions in inventory forms
- Supporting standard and ingredient-specific conversion units

### 5.3 Consumption Tracking

Users can log consumption from recipes, ingredients, inventory items, or custom entries. Consumption records store meal type, portion, estimated nutrition, timestamp, and user association.

The system provides:

- Consumption preview before saving
- Daily nutrition summary
- Consumption history
- Date-range analysis
- Calorie and macronutrient trend display
- Inventory deduction when consumed from managed inventory

This connects meal recommendations with actual eating behavior, allowing recent consumption to influence future diversity scoring.

---

## 6. User Profile and Personalization

### 6.1 Profile Data

The profile model supports personalization through:

- Diet type
- Dietary goal
- Allergies
- Disliked ingredients
- Weight
- Height
- Age
- Gender
- Activity level
- Daily calorie target

Daily calorie target can be calculated from body metrics and goals, then used by recommendation and consumption workflows.

### 6.2 Hard and Soft Constraints

The system distinguishes between hard and soft personalization constraints:

- **Hard constraints:** Allergies and incompatible diet types are treated as safety filters.
- **Soft constraints:** Disliked ingredients and cravings influence ranking but do not always eliminate recipes.

This distinction allows the system to be strict where safety matters and flexible where preference trade-offs are acceptable.

### 6.3 Feedback Signals

The platform captures user feedback through:

- Recipe ratings
- Recommendation ratings and comments
- Favorite recipes
- Cooked recommendation markers
- Consumption history

These signals support ranking, popularity, diversity, and future personalization.

---

## 7. Inventory and Collaboration Methodology

### 7.1 Inventory Groups

Inventory is organized into groups rather than a single flat list. This supports real-world contexts such as home, office, shared kitchen, or other locations.

Each group can contain:

- Items
- Ingredient references
- Quantity and unit data
- Low-stock tracking
- Members

### 7.2 Shared Inventory

Users can invite others to inventory groups. Invitations create notification records and can be accepted, rejected, or cancelled.

This supports collaborative household usage where multiple users share ingredients and consumption actions.

### 7.3 Shopping List Methodology

The shopping list workflow identifies inventory needs across selected groups. This turns recommendation and inventory data into an actionable replenishment workflow.

---

## 8. Recipe and Dataset Methodology

### 8.1 Recipe Lifecycle

Recipes support more than static display. The implemented lifecycle includes:

- Creation
- Update
- Version access
- Preferred version selection
- Approval submission
- Admin approval or rejection
- Favorite toggling
- Image upload
- Rating

This enables both curated recipes and user/admin-managed recipe evolution.

### 8.2 Dataset Processing

Python utility scripts prepare recipe and ingredient data before import. The methodology includes:

- Cleaning textual ingredient and recipe data
- Normalizing ingredient names
- Merging duplicate or similar ingredient records
- Generalizing ingredient names where needed
- Validating required sheets and relational references
- Importing ingredients, nutrition, recipes, recipe ingredients, and ingredient units into PostgreSQL
- Predicting or assigning preferred units when missing

The utilities use libraries such as pandas, openpyxl, SQLAlchemy, psycopg2, thefuzz, and python-Levenshtein.

---

## 9. User Interface Methodology

### 9.1 Design and Interaction Principles

The frontend is designed as an application interface rather than a static informational website. The main principles are:

- Feature-based navigation
- Responsive layouts
- Clear loading, empty, and error states
- Toast feedback for user actions
- Form validation and API error handling
- Route protection for authenticated and admin-only screens
- Reusable modals and shared UI elements

### 9.2 Key User Workflows

Implemented user workflows include:

1. Authenticate or enter guest mode depending on configuration.
2. Complete or update profile preferences.
3. Manage inventory groups and inventory items.
4. Search and inspect recipes.
5. Generate recipe or menu recommendations.
6. Save AI API keys for selected providers when needed.
7. Rate recommendations or mark recipes as cooked.
8. Log consumption and inspect nutrition history.
9. Respond to inventory invitations and notifications.
10. Use admin screens for privileged management tasks.

### 9.3 Recommendation UI

The recommendation interface supports:

- AI model selection
- Encrypted API key storage
- Craving input
- Menu category selection
- Menu recommendation tabs
- Recipe recommendation results
- Rating drafts
- Recommendation history
- Contextual display of matched and missing ingredients

---

## 10. Evaluation Methodology

### 10.1 Automated Testing

The project uses automated tests across multiple layers:

- Domain service tests
- Repository tests
- Controller tests
- Mapper tests
- Utility tests
- Security-related test support
- Storage integration tests
- Recommendation strategy tests
- Unit conversion tests

JUnit, Mockito, Spring test utilities, and Testcontainers are used where appropriate.

### 10.2 Recommendation Evaluation

Recommendation behavior is evaluated through tests and deterministic fallbacks. Important verification areas include:

- Safe recipe filtering by allergies and diet type
- Inventory matching
- Craving and disliked ingredient handling
- Nutrition scoring against calorie targets
- Recent-consumption diversity penalties
- AI response parsing
- Fallback behavior when AI is unavailable
- Free-model behavior with no external AI call

### 10.3 Data and Integration Evaluation

Dataset import scripts include preflight validation to check sheet availability, required columns, and referential consistency before importing data.

Integration-level evaluation includes authenticated controller behavior, persistence behavior, storage operations, and application startup checks.

### 10.4 Key Metrics

| Metric | Description |
| --- | --- |
| Recommendation relevance | Alignment with inventory, diet type, allergies, cravings, and nutrition goals |
| Fallback reliability | Ability to produce useful recommendations without external AI |
| Nutrition correctness | Accuracy of gram conversion and macro aggregation |
| API response time | Performance of backend endpoints and AI-assisted flows |
| Test success rate | Pass rate of automated backend and utility tests |
| User workflow completion | Ability to complete inventory, recommendation, consumption, and profile flows |

---

## 11. Risk Management and Alternative Solutions

### 11.1 AI Service Risks

**Risk:** AI providers may be unavailable, return invalid JSON, or produce low-quality explanations.

**Mitigation:** The backend validates AI output, limits AI choices to pre-ranked candidate pools, and falls back to deterministic recommendations whenever needed. The `FREE` model also allows the platform to operate without external AI.

### 11.2 Data Quality Risks

**Risk:** Ingredient names, unit conversions, or nutrition records may be incomplete or inconsistent.

**Mitigation:** Data-processing utilities clean and normalize source data, import scripts run preflight checks, and runtime services use fallback behavior for missing values.

### 11.3 Security Risks

**Risk:** Unauthorized users may access protected resources or admin operations.

**Mitigation:** JWT validation, issuer validation, route authorization, role checks, and frontend private routes are used. User-provided AI API keys are encrypted before local storage and decrypted server-side only when needed.

### 11.4 Performance Risks

**Risk:** Recommendation generation may become expensive as recipe, inventory, and history data grow.

**Mitigation:** Candidate pools are limited, scoring is performed on bounded sets, repository queries filter unsafe recipes early, and AI prompts receive only curated candidate data.

### 11.5 Storage and Integration Risks

**Risk:** External services such as MinIO, Keycloak, or AI providers may be unavailable.

**Mitigation:** Testcontainers and local profiles support integration testing, storage functionality is abstracted behind a file storage service, and authentication can be configured for local guest-mode frontend behavior.

---

## 12. Conclusion

The current methodology combines deterministic backend scoring with optional AI enhancement. The platform prioritizes safe filtering, explainable recommendations, nutrition-aware ranking, practical inventory usage, and resilient fallback behavior.

The implemented system now goes beyond the original project proposal by including collaborative inventory groups, consumption analysis, admin workflows, recipe lifecycle management, multiple AI providers, encrypted user API keys, Keycloak-based security, MinIO storage, and a structured dataset preparation pipeline.
