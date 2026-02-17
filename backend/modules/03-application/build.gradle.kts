plugins {
    id("org.springframework.boot")
}

dependencies {
    implementation(project(":02-domain"))
    implementation(project(":04-utilities"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
