dependencies {
    implementation(project(":infrastructure-core"))
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.mapstruct:mapstruct:1.5.5.Final")
    annotationProcessor("org.mapstruct:mapstruct-processor:1.5.5.Final")
    
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation(project(":infrastructure-test"))
}
