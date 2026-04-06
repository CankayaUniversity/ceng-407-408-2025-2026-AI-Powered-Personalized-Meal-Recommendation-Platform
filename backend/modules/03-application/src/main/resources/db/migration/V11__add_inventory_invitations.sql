CREATE TABLE inventory_invitations (
    id BIGSERIAL PRIMARY KEY,
    inventory_group_id BIGINT NOT NULL,
    inviter_id VARCHAR(50) NOT NULL,
    invitee_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_invitation_group FOREIGN KEY (inventory_group_id) REFERENCES inventory_groups(id),
    CONSTRAINT fk_invitation_inviter FOREIGN KEY (inviter_id) REFERENCES users(id)
);

CREATE INDEX idx_invitation_invitee_email ON inventory_invitations(invitee_email);
