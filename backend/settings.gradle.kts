rootProject.name = "meal-recommendation-platform"

include("01-infrastructure")
project(":01-infrastructure").projectDir = file("modules/01-infrastructure")

include("02-domain")
project(":02-domain").projectDir = file("modules/02-domain")

include("03-application")
project(":03-application").projectDir = file("modules/03-application")

include("04-utilities")
project(":04-utilities").projectDir = file("modules/04-utilities")
