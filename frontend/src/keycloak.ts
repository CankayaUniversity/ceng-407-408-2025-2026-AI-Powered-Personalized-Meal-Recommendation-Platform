import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: 'http://127.0.0.1:8080',
  realm: 'meal-app-realm',
  clientId: 'meal-app-backend',
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
