package org.example.common.exception;

import java.time.Instant;
import java.util.List;

public class ApiError {
    private Instant timestamp;
    private int status;
    private String error;
    private String path;
    private List<FieldViolation> violations;

    public ApiError() {}

    public ApiError(Instant timestamp, int status, String error, String path, List<FieldViolation> violations) {
        this.timestamp = timestamp;
        this.status = status;
        this.error = error;
        this.path = path;
        this.violations = violations;
    }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public List<FieldViolation> getViolations() { return violations; }
    public void setViolations(List<FieldViolation> violations) { this.violations = violations; }

    public static class FieldViolation {
        private String field;
        private String message;

        public FieldViolation() {}

        public FieldViolation(String field, String message) {
            this.field = field;
            this.message = message;
        }

        public String getField() { return field; }
        public void setField(String field) { this.field = field; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}
