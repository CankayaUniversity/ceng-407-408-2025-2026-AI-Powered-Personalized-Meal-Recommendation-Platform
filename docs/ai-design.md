# AI Design and Integration

## AI Approach
The project does not aim to train or deploy a local machine learning model due to hardware and resource constraints. Instead, it adopts a **prompt-based AI integration approach** using an online AI service.

## AI Role in the System
The AI component assists in:
- Generating personalized meal suggestions
- Adapting recommendations to dietary goals
- Interpreting ingredient combinations creatively

The AI is treated as an external service rather than a core system dependency.

## Integration Flow
1. User inputs ingredients and preferences
2. Backend processes and normalizes data
3. A structured prompt is generated
4. Prompt is sent to the AI service via REST API
5. AI response is parsed and validated
6. Final recommendations are returned to the frontend

## Prompt Engineering
Prompts are constructed dynamically using:
- Available ingredients
- Nutritional goals
- User preferences
- Dietary restrictions

This approach allows flexible behavior without retraining models.

## Advantages of This Design
- No dependency on local AI hardware
- Easy replacement of AI provider
- Clear separation between business logic and AI logic
- Academically suitable and realistic

## Limitations
- AI output quality depends on prompt design
- External service availability may affect response time

## Future Improvements
- Prompt optimization strategies
- Caching AI responses
- Hybrid rule-based and AI-based recommendation logic
