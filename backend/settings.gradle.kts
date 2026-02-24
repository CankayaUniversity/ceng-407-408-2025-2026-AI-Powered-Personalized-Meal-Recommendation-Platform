rootProject.name = "AI-Powered-Personalized-Meal-Recommendation-Platform"

include(":infrastructure-core")
include(":infrastructure-test")
project(":infrastructure-core").projectDir = file("modules/01-infrastructure/infrastructure-core")
project(":infrastructure-test").projectDir = file("modules/01-infrastructure/infrastructure-test")

include(":02-domain")
project(":02-domain").projectDir = file("modules/02-domain")

include(":03-application")
project(":03-application").projectDir = file("modules/03-application")

include(":04-utilities")
project(":04-utilities").projectDir = file("modules/04-utilities")
