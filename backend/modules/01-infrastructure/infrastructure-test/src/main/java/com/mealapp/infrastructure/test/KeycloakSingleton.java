package com.mealapp.infrastructure.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dasniko.testcontainers.keycloak.KeycloakContainer;
import org.testcontainers.containers.Container;

import java.io.IOException;

/**
 * Singleton for Keycloak Testcontainer to be used across integration tests.
 */
public final class KeycloakSingleton {

	private KeycloakSingleton() {
	}

	public static final KeycloakContainer INSTANCE = new KeycloakContainer("quay.io/keycloak/keycloak:26.0.0")
		.withAdminUsername("admin")
		.withAdminPassword("admin");

	private static final ObjectMapper objectMapper = new ObjectMapper();

    static {
        INSTANCE.start();
        try {
            INSTANCE.execInContainer(
                "sh", "-c",
                "/opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password admin && " +
                    "/opt/keycloak/bin/kcadm.sh create realms -s realm=mealapp -s enabled=true && " +
                    "/opt/keycloak/bin/kcadm.sh update realms/mealapp -s sslRequired=none && " +
                    "/opt/keycloak/bin/kcadm.sh create clients -r mealapp -s clientId=mealapp-backend -s enabled=true -s publicClient=false -s protocol=openid-connect -s serviceAccountsEnabled=true -s standardFlowEnabled=false -s directAccessGrantsEnabled=false -s implicitFlowEnabled=false"
            );
        }
        catch (Exception e) {
            throw new RuntimeException("Could not create mealapp realm", e);
        }
    }

	public static String getClientSecret() {
		String clientUuid = findClientUuid();

		try {
			Container.ExecResult res = INSTANCE.execInContainer(
				"/opt/keycloak/bin/kcadm.sh",
				"get", "clients/" + clientUuid + "/client-secret",
				"-r", "mealapp"
			);
			if (res.getExitCode() != 0) {
				throw new IllegalStateException("kcadm get client-secret failed:\n" + res.getStderr());
			}

			JsonNode node = objectMapper.readTree(res.getStdout());
			JsonNode value = node.get("value");
			if (value == null || value.asText().isBlank()) {
				throw new IllegalStateException("Client secret not returned for clientUuid=" + clientUuid);
			}

			return value.asText();
		}
		catch (InterruptedException | IOException e) {
			throw new RuntimeException(e);
		}
	}

	private static String findClientUuid() {
		try {
			Container.ExecResult res = INSTANCE.execInContainer(
				"/opt/keycloak/bin/kcadm.sh",
				"get", "clients",
				"-r", "mealapp",
				"-q", "clientId=mealapp-backend"
			);
			if (res.getExitCode() != 0) {
				throw new IllegalStateException("kcadm get clients failed:\n" + res.getStderr());
			}

			JsonNode arr = objectMapper.readTree(res.getStdout());
			if (!arr.isArray() || arr.isEmpty()) {
				throw new IllegalStateException("Keycloak backend client not found");
			}

			// first match
			return arr.get(0).get("id").asText();
		}
		catch (InterruptedException | IOException e) {
			throw new RuntimeException(e);
		}
	}


}
