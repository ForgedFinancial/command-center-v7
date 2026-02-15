# Security Audit Prompt Library

> **How to use:** Copy any prompt below and paste it into Claude (or your AI agent of choice). Each prompt is self-contained and ready to execute. Run them against your codebase, infrastructure, or documentation as needed.
>
> **Severity Tags:** `CRITICAL` = exploit likely, fix immediately | `HIGH` = significant risk | `MEDIUM` = should fix | `LOW` = best practice improvement

---

## Table of Contents

1. [Infrastructure & Server Security](#1-infrastructure--server-security)
2. [Application Security (OWASP Top 10)](#2-application-security-owasp-top-10)
3. [Authentication & Access Control](#3-authentication--access-control)
4. [Data Protection & Privacy](#4-data-protection--privacy)
5. [Network Security](#5-network-security)
6. [API Security](#6-api-security)
7. [Cloud Provider Security](#7-cloud-provider-security)
8. [Database Security](#8-database-security)
9. [Client-Side Security](#9-client-side-security)
10. [Monitoring, Logging & Incident Response](#10-monitoring-logging--incident-response)
11. [Compliance & Governance](#11-compliance--governance)
12. [Supply Chain & Dependency Security](#12-supply-chain--dependency-security)
13. [Social Engineering & Human Factors](#13-social-engineering--human-factors)
14. [Penetration Testing Prompts](#14-penetration-testing-prompts)
15. [Security Hardening Checklists](#15-security-hardening-checklists)
16. [Quick-Fire Diagnostic Prompts](#16-quick-fire-diagnostic-prompts)

---

## 1. Infrastructure & Server Security

### `CRITICAL` — Open Port & Service Enumeration

```
Audit my server infrastructure for security. I need you to:

1. Review my server configuration files (I will provide them) and identify:
   - All open ports and what service runs on each
   - Any ports that should NOT be publicly accessible (databases, admin panels, debug endpoints)
   - Services running as root that shouldn't be
   - Default credentials or configurations that were never changed

2. For each finding, tell me:
   - The risk level (Critical/High/Medium/Low)
   - What an attacker could do with this
   - The exact command or config change to fix it

3. Generate a hardened configuration file I can use as a replacement.

Assume I am running [Linux/Ubuntu/CentOS — specify your OS]. My server hosts a Node.js web application with a database.
```

### `HIGH` — SSH Configuration Audit

```
Audit my SSH configuration for security weaknesses. I will provide my sshd_config file. Check for:

1. Password authentication enabled (should be key-only)
2. Root login permitted
3. Default port 22 still in use
4. Missing fail2ban or rate limiting
5. Weak key exchange algorithms or ciphers allowed
6. Missing AllowUsers/AllowGroups restrictions
7. Agent forwarding enabled unnecessarily
8. X11 forwarding enabled unnecessarily
9. Empty passwords permitted
10. MaxAuthTries set too high

For each issue found, give me:
- The specific line to change
- The secure replacement value
- A one-sentence explanation of why

Then generate a complete hardened sshd_config I can deploy.
```

### `HIGH` — Firewall Rules Review

```
Review my firewall configuration for security gaps. I will provide my iptables/ufw/security group rules. Analyze:

1. Are there any rules allowing 0.0.0.0/0 (all traffic) to sensitive ports?
2. Are database ports (3306, 5432, 27017, 6379) exposed to the internet?
3. Is there a default deny policy for inbound traffic?
4. Are outbound rules restricted or is all egress allowed?
5. Are ICMP rules appropriately configured?
6. Are there any overlapping or contradictory rules?
7. Is IPv6 traffic accounted for or left wide open?

Output a table: | Rule | Risk | Issue | Fix |
Then generate the corrected firewall ruleset.
```

### `MEDIUM` — OS Hardening Check

```
Generate a comprehensive OS hardening checklist for my production server. Cover:

1. Unnecessary services to disable
2. Kernel parameters to harden (sysctl.conf)
3. File permission issues (world-writable files, SUID binaries)
4. Automatic security updates configuration
5. Disk encryption status
6. Tmp directory noexec mount
7. Core dump restrictions
8. Login banner / legal warning
9. Audit daemon (auditd) configuration
10. USB/removable media restrictions

For each item, provide the exact command to check the current state and the command to fix it.
```

### `MEDIUM` — Container Security (Docker/K8s)

```
Audit my Docker/container setup for security vulnerabilities. Review my Dockerfile(s) and docker-compose.yml (I will provide them). Check for:

1. Running containers as root
2. Using :latest tags instead of pinned versions
3. Sensitive data (secrets, API keys) in the image or environment variables
4. Unnecessary packages installed in the image
5. Missing health checks
6. Privileged mode enabled
7. Host network mode used unnecessarily
8. Volumes mounting sensitive host directories
9. Missing resource limits (CPU/memory)
10. No read-only root filesystem
11. Missing security-opt and no-new-privileges

For each issue, provide the fixed Dockerfile/compose snippet.
```

---

## 2. Application Security (OWASP Top 10)

### `CRITICAL` — Full OWASP Top 10 Scan

```
Perform a comprehensive OWASP Top 10 security audit on my application codebase. I will provide the source code. For each of the following, search the entire codebase and report every instance:

1. **A01 Broken Access Control** — Missing authorization checks, IDOR vulnerabilities, privilege escalation paths, missing CORS restrictions
2. **A02 Cryptographic Failures** — Hardcoded secrets, weak hashing (MD5/SHA1 for passwords), missing encryption, plaintext storage of sensitive data
3. **A03 Injection** — SQL injection, NoSQL injection, command injection, LDAP injection, XPath injection, template injection (SSTI)
4. **A04 Insecure Design** — Missing rate limiting, no account lockout, predictable resource IDs, missing input validation
5. **A05 Security Misconfiguration** — Debug mode in production, default credentials, unnecessary features enabled, missing security headers, verbose error messages
6. **A06 Vulnerable Components** — Outdated dependencies with known CVEs, unmaintained packages
7. **A07 Authentication Failures** — Weak password requirements, missing MFA, session fixation, credential stuffing vulnerability
8. **A08 Data Integrity Failures** — Missing integrity checks on updates, insecure deserialization, unsigned packages
9. **A09 Logging Failures** — Sensitive data in logs, missing audit trail, no alerting on suspicious activity
10. **A10 SSRF** — User-controlled URLs passed to server-side fetch/request functions

For each finding, provide:
- File path and line number
- Severity rating
- Proof of concept (how to exploit it)
- The exact code fix
```

### `CRITICAL` — SQL/NoSQL Injection Audit

```
Search my entire codebase for SQL and NoSQL injection vulnerabilities. Look for:

1. String concatenation in SQL queries (not using parameterized queries)
2. Template literals or f-strings in database queries
3. User input passed directly into .find(), .where(), .query(), .exec(), or .raw()
4. MongoDB operators in user input ($gt, $ne, $regex, $where)
5. ORM methods that accept raw SQL without sanitization
6. Stored procedures that build dynamic SQL
7. Query builder methods that interpolate user values

For each finding, show:
- The vulnerable code
- An example malicious input that would exploit it
- The parameterized/safe version of the code

Also check if there is a centralized query sanitization layer or if each query handles its own safety.
```

### `CRITICAL` — Cross-Site Scripting (XSS) Audit

```
Audit my codebase for all XSS vulnerability vectors. Search for:

1. **Reflected XSS**: User input echoed back in HTML responses without encoding
2. **Stored XSS**: User-provided data saved to database and rendered without sanitization
3. **DOM XSS**: Client-side JS that reads from location, document.referrer, or postMessage and writes to innerHTML, document.write, or eval
4. **Template injection**: Template engines rendering unescaped variables (e.g., {{{var}}} in Handlebars, |safe in Jinja, dangerouslySetInnerHTML in React)
5. **Attribute injection**: User input inside HTML attributes without encoding (onclick, href, src, style)
6. **JavaScript context injection**: User input placed inside <script> tags or event handlers

For each finding:
- Show the vulnerable code path (input source → sink)
- Provide a working XSS payload that would trigger
- Provide the fixed code using proper output encoding
```

### `HIGH` — Cross-Site Request Forgery (CSRF) Audit

```
Audit my application for CSRF vulnerabilities. Check:

1. Do all state-changing endpoints (POST/PUT/DELETE) require a CSRF token?
2. Is the CSRF token validated on the server side?
3. Are there any state-changing GET requests? (These bypass CSRF protections)
4. Is SameSite cookie attribute set on session cookies?
5. Does the application verify the Origin or Referer header?
6. Are there API endpoints that accept both cookie auth and token auth? (cookie-based is CSRF-vulnerable)
7. Is the CSRF token per-session or per-request?
8. Can the CSRF token be leaked via the Referer header?

List every unprotected endpoint with its HTTP method and what action it performs. Rate each by severity.
```

### `HIGH` — Insecure Direct Object Reference (IDOR) Audit

```
Search my codebase for IDOR (Insecure Direct Object Reference) vulnerabilities. Check every endpoint that:

1. Takes an ID parameter (user ID, document ID, order ID, etc.)
2. Returns or modifies a resource based on that ID
3. Does NOT verify that the authenticated user owns or has permission to access that resource

For each endpoint, verify:
- Is there an authorization check after authentication?
- Can User A access User B's data by changing the ID in the URL/body?
- Are IDs sequential/predictable (auto-increment) vs random UUIDs?
- Are there any mass assignment vulnerabilities where a user can set their own role/permissions?

Provide a test case for each vulnerable endpoint showing how to exploit the IDOR.
```

### `HIGH` — Server-Side Request Forgery (SSRF) Audit

```
Audit my codebase for SSRF vulnerabilities. Look for any place where:

1. User-supplied URLs are fetched server-side (fetch, axios, http.get, urllib, requests)
2. User input controls hostnames, IPs, or ports in backend requests
3. Webhook URLs are user-configurable without validation
4. Image/file download URLs come from user input
5. PDF generation fetches user-supplied URLs
6. XML parsing with external entity resolution (XXE → SSRF)
7. Redirect URLs are not validated against an allowlist

For each finding, show:
- The code path from user input to server-side request
- An example payload (e.g., http://169.254.169.254/latest/meta-data/ for cloud metadata)
- The fix (URL allowlist, DNS rebinding protection, private IP blocking)
```

### `MEDIUM` — Mass Assignment / Over-Posting

```
Search my codebase for mass assignment vulnerabilities. Look for:

1. Request body passed directly to ORM create/update methods without field filtering
2. Object.assign() or spread operator merging user input into model objects
3. Missing allowlists for which fields a user can set
4. Admin-only fields (role, isAdmin, permissions, verified) that could be set by a regular user

For each endpoint that accepts a request body, verify:
- Is there an explicit allowlist of accepted fields?
- Can a user set fields they shouldn't (role escalation, price manipulation, ownership transfer)?
- Show a proof-of-concept request that would exploit it
- Provide the fixed code using explicit field picking
```

---

## 3. Authentication & Access Control

### `CRITICAL` — Authentication System Audit

```
Perform a complete audit of my authentication system. Examine:

1. **Password Storage**
   - What hashing algorithm is used? (bcrypt/argon2 = good, MD5/SHA1/SHA256 = bad)
   - What is the salt strategy? (unique per user? sufficient rounds?)
   - Are passwords stored in plaintext anywhere (logs, backups, error messages)?

2. **Login Flow**
   - Is there brute force protection (rate limiting, account lockout, CAPTCHA)?
   - Are login error messages generic ("invalid credentials") or do they leak info ("user not found" vs "wrong password")?
   - Is the login endpoint over HTTPS?
   - Is there timing attack protection on password comparison?

3. **Session Management**
   - How are sessions stored? (JWT, server-side sessions, cookies)
   - What is the session timeout? Is there an idle timeout?
   - Are sessions invalidated on password change?
   - Can sessions be revoked (logout actually works)?
   - Are session tokens sufficiently random and long?

4. **Password Reset**
   - Are reset tokens time-limited and single-use?
   - Is the reset link sent only via email (not shown in response)?
   - Can an attacker enumerate valid emails via the reset flow?
   - Is the old password invalidated immediately when a new one is set?

5. **Multi-Factor Authentication**
   - Is MFA available? Is it enforced for admin accounts?
   - What MFA methods are supported (TOTP, SMS, hardware key)?
   - Can MFA be bypassed via the API?
   - Are backup/recovery codes implemented securely?

Report every finding with severity, evidence, and fix.
```

### `HIGH` — Authorization & Role-Based Access Control

```
Audit my authorization system for privilege escalation and access control bypass. Check:

1. **Vertical Privilege Escalation**
   - Can a regular user access admin endpoints by knowing the URL?
   - Are admin routes protected by middleware or only by hiding the UI?
   - Can a user modify their own role/permissions in their profile update request?

2. **Horizontal Privilege Escalation**
   - Can User A access User B's resources by changing IDs?
   - Are all data queries scoped to the authenticated user's organization/tenant?

3. **Middleware Consistency**
   - Are there any routes that forgot to apply the auth middleware?
   - Is the authorization check applied AFTER authentication (correct order)?
   - Are file upload/download endpoints properly authorized?

4. **API vs UI Authorization**
   - Does the API enforce the same restrictions as the UI?
   - Can disabled features be accessed directly via API?
   - Are webhook/callback endpoints authenticated?

List every endpoint with its required role and verify the enforcement.
```

### `HIGH` — API Key & Secret Management

```
Scan my entire project (including git history, config files, environment files, CI/CD pipelines, and client-side code) for exposed secrets. Look for:

1. API keys, tokens, or passwords hardcoded in source files
2. .env files committed to git
3. Secrets in docker-compose.yml or Dockerfiles
4. Private keys, certificates, or keystores in the repository
5. Database connection strings with embedded passwords
6. AWS access keys, GCP service account keys, Azure connection strings
7. Webhook secrets, signing keys, encryption keys in code
8. Secrets in client-side JavaScript (bundled into the browser)
9. Secrets in CI/CD configuration (GitHub Actions, Jenkins, etc.)
10. Secrets in comments or documentation

For each finding:
- Show the exact location (file, line)
- Classify the secret type
- Rate the exposure risk
- Provide the secure alternative (environment variable, secret manager, vault)

Also verify:
- Is there a .gitignore entry for .env files?
- Is there a pre-commit hook to prevent secret commits?
- Are secrets rotated on a schedule?
```

### `MEDIUM` — OAuth / SSO Implementation Audit

```
Audit my OAuth/SSO implementation for security flaws. Check:

1. Is the state parameter used and validated to prevent CSRF?
2. Is PKCE used for public clients (SPAs, mobile apps, desktop apps)?
3. Are redirect URIs strictly validated (no open redirect)?
4. Are tokens stored securely (HttpOnly cookies, not localStorage)?
5. Is the authorization code exchanged exactly once?
6. Are access tokens short-lived with refresh token rotation?
7. Is token revocation implemented?
8. Are scopes properly restricted (least privilege)?
9. Is the ID token verified (signature, issuer, audience, expiry)?
10. Can an attacker inject a malicious redirect_uri?

For each issue, show the vulnerable code/config and the fix.
```

### `MEDIUM` — Session Security Deep Dive

```
Audit my session management implementation. Verify:

1. Session ID entropy: Are session tokens at least 128 bits of randomness?
2. Cookie flags: HttpOnly, Secure, SameSite=Strict/Lax, Path, Domain
3. Session fixation: Is a new session ID issued after login?
4. Concurrent sessions: Can a user be logged in from multiple devices? Is there a session list/revocation UI?
5. Session storage: Where are sessions stored? (memory = lost on restart, Redis = good, DB = check encryption)
6. Absolute timeout: Is there a maximum session lifetime regardless of activity?
7. Idle timeout: Does the session expire after inactivity?
8. Logout: Does logout destroy the session server-side (not just delete the cookie)?
9. Token rotation: Are refresh tokens rotated on use and old ones invalidated?
10. Cross-device logout: Does "log out everywhere" actually work?

Provide the exact code/config for each fix.
```

---

## 4. Data Protection & Privacy

### `CRITICAL` — Sensitive Data Exposure Audit

```
Audit my application for sensitive data exposure. Search for:

1. **Data in Transit**
   - Are ALL endpoints served over HTTPS? Any HTTP fallbacks?
   - Is HSTS (HTTP Strict Transport Security) enabled with a long max-age?
   - What TLS version and cipher suites are supported? (TLS 1.0/1.1 = bad)
   - Are internal service-to-service communications encrypted?

2. **Data at Rest**
   - Are database fields containing PII encrypted? (SSN, DOB, bank info)
   - Are file uploads stored encrypted?
   - Are backups encrypted?
   - Are logs sanitized (no PII in log files)?

3. **Data in Use**
   - Are sensitive fields masked in the UI (SSN shows as ***-**-1234)?
   - Are sensitive fields excluded from API list responses (only shown in detail view)?
   - Are sensitive fields excluded from search indexes?
   - Can sensitive data be exported in CSV/reports without authorization?

4. **Data Leakage Vectors**
   - Are sensitive fields included in error messages or stack traces?
   - Are API responses over-sharing (returning all fields instead of only needed ones)?
   - Are browser caching headers set to prevent sensitive data caching?
   - Is autocomplete disabled on sensitive form fields?

For the insurance CRM context specifically, check: SSN, DOB, bank routing numbers, policy numbers, beneficiary info, health data, income data.
```

### `HIGH` — Encryption Implementation Review

```
Review all encryption used in my application. Check:

1. **Password Hashing**
   - Algorithm: bcrypt (cost 12+) or argon2id? Not MD5/SHA1/SHA256?
   - Unique salt per password?
   - Is the hashing done server-side (not client-side)?

2. **Data Encryption**
   - Algorithm: AES-256-GCM or ChaCha20-Poly1305? Not DES/3DES/AES-ECB?
   - Key management: Where are encryption keys stored? Hardcoded in code?
   - IV/nonce: Is a unique IV generated per encryption operation?
   - Key rotation: Is there a process to rotate keys without data loss?

3. **Token Generation**
   - Are tokens generated using crypto.randomBytes() or equivalent CSPRNG?
   - Are JWT tokens signed with a strong algorithm (RS256/ES256, not HS256 with a weak secret)?
   - Are JWT secrets sufficiently long and random?

4. **TLS Configuration**
   - Minimum TLS 1.2?
   - Strong cipher suites only?
   - Certificate pinning for mobile/desktop apps?
   - OCSP stapling enabled?

Show every instance of cryptographic code with its assessment.
```

### `HIGH` — PII Handling & Privacy Compliance

```
Audit my application's handling of Personally Identifiable Information (PII) for privacy compliance. Check:

1. **Data Inventory**
   - What PII does the application collect? List every field.
   - Where is each PII field stored (which database, which table/collection)?
   - Is there a data retention policy? How long is PII kept?
   - Is there a process to delete a user's PII upon request (right to deletion)?

2. **Consent & Transparency**
   - Is there a privacy policy that accurately describes data collection?
   - Is user consent obtained before collecting PII?
   - Can users view what data is stored about them (right to access)?
   - Can users export their data in a portable format (data portability)?

3. **Data Minimization**
   - Is the application collecting only the PII it actually needs?
   - Are there fields collected "just in case" that aren't used?
   - Are SSN/full bank account numbers stored when only last-4 is needed?

4. **Third-Party Sharing**
   - Is PII sent to any third-party services (analytics, email providers, CRMs)?
   - Are data processing agreements in place with third parties?
   - Is PII included in error tracking/logging services (Sentry, LogRocket)?

Produce a PII data map: | Field | Storage Location | Encrypted | Retention | Third Parties | Compliance Status |
```

### `MEDIUM` — Backup Security Audit

```
Audit the security of my backup systems. Verify:

1. Are backups encrypted at rest?
2. Are backup encryption keys stored separately from the backups?
3. Are backups stored in a different physical location/region than the primary data?
4. Who has access to backups? Is access logged?
5. Are backups tested regularly (can you actually restore from them)?
6. What is the backup retention schedule?
7. Are old backups securely deleted (not just marked as deleted)?
8. Are database backups (pg_dump, mongodump) transmitted over encrypted channels?
9. Can an attacker with server access also access all backups?
10. Is there a documented backup recovery procedure with RTO/RPO targets?

For each gap, provide the specific fix and priority.
```

---

## 5. Network Security

### `HIGH` — HTTP Security Headers Audit

```
Audit my application's HTTP security headers. Check for the presence and correct configuration of:

1. Content-Security-Policy (CSP) — is it set? Is it restrictive enough? Does it allow 'unsafe-inline' or 'unsafe-eval'?
2. X-Content-Type-Options: nosniff
3. X-Frame-Options: DENY (or SAMEORIGIN if iframes needed)
4. Strict-Transport-Security (HSTS) — min 1 year, includeSubDomains, preload
5. X-XSS-Protection: 0 (deprecated, but should not be set to 1; mode=block)
6. Referrer-Policy: strict-origin-when-cross-origin (or stricter)
7. Permissions-Policy (formerly Feature-Policy) — camera, microphone, geolocation, etc.
8. Cross-Origin-Opener-Policy (COOP)
9. Cross-Origin-Resource-Policy (CORP)
10. Cross-Origin-Embedder-Policy (COEP)

Also check:
- Are there any Server headers leaking version info (nginx/1.x, Express, PHP/7.x)?
- Are there X-Powered-By headers that should be removed?
- Are cookies set with Secure, HttpOnly, SameSite flags?

Provide the exact header values I should set and where to configure them.
```

### `HIGH` — SSL/TLS Configuration Audit

```
Audit my SSL/TLS configuration. I will provide my domain(s). Check:

1. Certificate validity and expiration date
2. Certificate chain completeness (no missing intermediates)
3. TLS version support (TLS 1.3 preferred, TLS 1.2 minimum, TLS 1.0/1.1 must be disabled)
4. Cipher suite strength (no RC4, DES, 3DES, NULL, EXPORT, or anon ciphers)
5. Perfect Forward Secrecy (ECDHE key exchange)
6. HSTS header presence and configuration
7. OCSP stapling
8. Certificate Transparency logs
9. Key size (RSA 2048+ or ECDSA P-256+)
10. Mixed content issues (HTTPS page loading HTTP resources)
11. Redirect chain: does HTTP → HTTPS redirect happen correctly?
12. Is the certificate auto-renewing (Let's Encrypt / ACME)?

Provide a secure nginx/Apache/Node.js TLS configuration block.
```

### `MEDIUM` — CORS Configuration Audit

```
Audit my Cross-Origin Resource Sharing (CORS) configuration. Check:

1. Is Access-Control-Allow-Origin set to * (wildcard)? If so, which endpoints?
2. Are credentials (cookies) allowed with a wildcard origin? (This is a browser-blocked combination but indicates misconfiguration)
3. Is the origin validated against an allowlist or is it reflected back from the request?
4. Are only necessary HTTP methods allowed in Access-Control-Allow-Methods?
5. Are only necessary headers allowed in Access-Control-Allow-Headers?
6. Is Access-Control-Max-Age set to cache preflight responses?
7. Are there any endpoints that should NOT have CORS enabled?
8. Can an attacker craft a page on their domain that makes authenticated requests to my API?

Provide the correct CORS configuration for my use case.
```

### `MEDIUM` — DNS Security Audit

```
Audit my DNS configuration for security. Check:

1. Are there any dangling DNS records pointing to decommissioned services (subdomain takeover risk)?
2. Is DNSSEC enabled?
3. Are SPF, DKIM, and DMARC records configured for email? (Prevents email spoofing)
4. Are there any wildcard DNS records that could be exploited?
5. Are DNS zone transfers restricted?
6. Is there a CAA record to restrict which CAs can issue certificates?
7. Are there any TXT records leaking sensitive information?
8. Is the DNS provider secured with MFA?
9. Are DNS query logs enabled for monitoring?
10. Is there DNS-over-HTTPS/TLS configured?

For each finding, provide the specific DNS record to add/modify.
```

---

## 6. API Security

### `CRITICAL` — API Security Full Audit

```
Perform a comprehensive security audit of my API. Check every endpoint for:

1. **Authentication**: Does every endpoint require authentication? Are there any endpoints that should require auth but don't?
2. **Authorization**: Does every endpoint verify the user has permission to perform the action on the specific resource?
3. **Input Validation**: Is every parameter validated for type, length, format, and range? Are there any parameters accepted but not validated?
4. **Rate Limiting**: Is there rate limiting on all endpoints? What are the limits? Are they per-user or per-IP?
5. **Output Filtering**: Do API responses return only necessary fields? Are there any endpoints that return sensitive fields (passwords, tokens, internal IDs)?
6. **Error Handling**: Do error responses leak sensitive information (stack traces, SQL queries, file paths)?
7. **HTTP Methods**: Are endpoints restricted to appropriate methods (no DELETE on a read-only resource)?
8. **Content Type**: Is Content-Type validated on requests? Can JSON endpoints be exploited via form submissions?
9. **Pagination**: Do list endpoints enforce pagination limits? Can an attacker request all records at once?
10. **Idempotency**: Are non-idempotent operations (charges, transfers) protected against replay?

Create a table: | Endpoint | Method | Auth | AuthZ | Validated | Rate Limited | Issues |
```

### `HIGH` — API Rate Limiting & Abuse Prevention

```
Audit my API's defenses against abuse. Check:

1. **Rate Limiting**
   - Is there a global rate limit?
   - Is there a per-endpoint rate limit (login should be stricter than read)?
   - Is rate limiting applied per-user, per-IP, or both?
   - What happens when the limit is exceeded (429 response? Retry-After header?)?
   - Can rate limits be bypassed with multiple API keys?
   - Can rate limits be bypassed by rotating IPs?

2. **Brute Force Protection**
   - Login endpoint: max attempts before lockout?
   - Password reset: max requests per email per time period?
   - OTP/MFA verification: max attempts?
   - API key enumeration: are invalid keys rate limited?

3. **Resource Exhaustion**
   - Can a user request extremely large payloads?
   - Are file uploads size-limited?
   - Are query parameters that control pagination capped?
   - Can complex queries (search, filter, sort) cause slow database operations?
   - Is there a request timeout?

4. **Business Logic Abuse**
   - Can a user create unlimited resources (accounts, leads, events)?
   - Can a user trigger expensive operations (email sends, PDF generation) without limits?
   - Are there any endpoints that could be used for spamming (invites, notifications)?

For each gap, provide the middleware/config to implement the protection.
```

### `MEDIUM` — API Input Validation Audit

```
Audit every API endpoint's input validation. For each endpoint that accepts user input, verify:

1. String inputs: max length enforced, special characters sanitized, encoding validated
2. Number inputs: min/max range, integer vs float, NaN/Infinity rejected
3. Email inputs: format validated, normalized (lowercase, trim)
4. Phone inputs: format validated, normalized
5. Date inputs: format validated, reasonable range (not year 9999)
6. URL inputs: protocol restricted (https only), no internal/private IPs
7. File uploads: type validated (magic bytes, not just extension), size limited, filename sanitized
8. Array inputs: max items enforced, each item validated
9. Object inputs: unknown keys rejected, each known key validated
10. Enum inputs: validated against allowed values (not just checked for type)

For each endpoint missing validation, provide the exact validation schema (using Joi, Zod, or your preferred library).
```

---

## 7. Cloud Provider Security

### `CRITICAL` — Cloud IAM & Access Audit

```
Audit my cloud provider (AWS/GCP/Azure — specify which) IAM configuration. Check:

1. **Root/Owner Account**
   - Is MFA enabled on the root account?
   - Are there access keys on the root account? (Should not be)
   - Is the root account used for daily operations? (Should not be)

2. **IAM Users & Roles**
   - Are there any users with admin/full access that don't need it?
   - Are IAM policies following least privilege? (Wildcard * resources or actions?)
   - Are there unused IAM users or roles that should be deactivated?
   - Are there service accounts with long-lived keys instead of temporary credentials?
   - Is MFA enforced for all human users?

3. **API Keys & Credentials**
   - Are there access keys older than 90 days?
   - Are there access keys that have never been used?
   - Are service account keys rotated?

4. **Cross-Account Access**
   - Are there any cross-account roles? Are they necessary?
   - Are external IDs required for cross-account assume-role?

5. **Logging**
   - Is CloudTrail/Activity Log/Audit Log enabled?
   - Are logs stored in a tamper-proof location?
   - Are alerts set up for suspicious IAM activity?

Produce a remediation plan sorted by risk.
```

### `HIGH` — Cloud Storage Security (S3/GCS/Blob)

```
Audit my cloud storage buckets for security misconfigurations. Check:

1. Are any buckets publicly accessible? (List, Read, Write)
2. Is server-side encryption enabled on all buckets?
3. Are bucket policies overly permissive?
4. Is versioning enabled (protection against accidental deletion)?
5. Is access logging enabled?
6. Are lifecycle policies configured (auto-delete old objects)?
7. Is MFA Delete enabled for critical buckets?
8. Are there any buckets with static website hosting enabled that shouldn't?
9. Are pre-signed URLs properly time-limited?
10. Is cross-account bucket access restricted?
11. Are there any public ACLs overriding bucket policies?
12. Is Block Public Access enabled at the account level?

For each bucket, report: | Bucket | Public? | Encrypted? | Versioned? | Logged? | Issues |
```

### `MEDIUM` — Cloud Network Configuration

```
Audit my cloud network configuration. Check:

1. VPC/VNet configuration — are resources in private subnets?
2. Security groups / NSGs — are ports overly permissive?
3. Internet gateways — are they necessary on all subnets?
4. NAT gateways — are private subnets using NAT for outbound?
5. VPN/Direct Connect — is access to the cloud from corporate network secure?
6. Load balancer configuration — TLS termination, health checks, WAF
7. Database access — are databases in private subnets only?
8. Bastion host / jump box — is SSH access through a bastion?
9. VPC flow logs — are they enabled?
10. Private endpoints — are cloud services accessed via private links?

Draw the network topology and identify every public-facing resource.
```

---

## 8. Database Security

### `CRITICAL` — Database Access Control Audit

```
Audit my database security configuration. Check:

1. **Access Control**
   - Is the database accessible from the internet? (Should only be from app servers)
   - Are there any users with full admin/root privileges that don't need them?
   - Does the application use a dedicated database user with minimal permissions?
   - Are database passwords strong and unique?
   - Is password authentication required (not trust or peer)?

2. **Encryption**
   - Is encryption at rest enabled?
   - Is encryption in transit enforced (SSL/TLS connection required)?
   - Are sensitive columns encrypted at the application level?

3. **Injection Prevention**
   - Are all queries parameterized? (Check the ORM and any raw queries)
   - Is there any dynamic SQL construction from user input?
   - Are stored procedures safe from injection?

4. **Auditing**
   - Is query logging enabled for write operations?
   - Are connection attempts logged (including failures)?
   - Is there a process to review database access logs?

5. **Backups**
   - Are automated backups configured?
   - Are backups encrypted?
   - Have backups been tested for restorability?
   - What is the point-in-time recovery window?

Provide a database hardening script for my specific database engine (PostgreSQL/MySQL/MongoDB/Redis).
```

### `HIGH` — Redis / Cache Security

```
If my application uses Redis, Memcached, or another caching layer, audit it:

1. Is Redis protected with a password (requirepass)?
2. Is Redis bound to localhost or a private network (not 0.0.0.0)?
3. Is the Redis port (6379) blocked from the internet?
4. Is TLS enabled for Redis connections?
5. Are dangerous commands disabled (FLUSHALL, FLUSHDB, CONFIG, DEBUG, KEYS)?
6. Is there a maxmemory policy set?
7. Are session tokens stored in Redis encrypted or at least signed?
8. Is Redis persistence configured (RDB/AOF) and secured?
9. Is there access control (Redis ACLs) with separate users for the app vs admin?
10. Are sensitive values (PII, tokens) stored in cache with appropriate TTL?

Provide a hardened Redis configuration file.
```

---

## 9. Client-Side Security

### `HIGH` — Client-Side Security Audit

```
Audit my frontend application for client-side security vulnerabilities. Check:

1. **localStorage/sessionStorage**
   - Are authentication tokens stored in localStorage? (Vulnerable to XSS — move to HttpOnly cookies)
   - Is any PII stored in browser storage?
   - Is sensitive data cleared on logout?

2. **Content Security Policy**
   - Is CSP implemented? What directives are set?
   - Does it allow unsafe-inline or unsafe-eval? (Both are XSS vectors)
   - Are there nonces or hashes for inline scripts?
   - Are CDN sources restricted to specific origins?

3. **JavaScript Security**
   - Are there any uses of eval(), Function(), innerHTML with user data?
   - Are third-party scripts loaded from CDN with Subresource Integrity (SRI)?
   - Are there any postMessage listeners that don't verify origin?
   - Is sensitive data exposed in the browser's JavaScript console?

4. **Form Security**
   - Is autocomplete disabled on sensitive fields (credit card, SSN)?
   - Are forms protected against clickjacking (X-Frame-Options)?
   - Is there CSRF protection on form submissions?

5. **Source Maps**
   - Are source maps disabled in production? (They expose original source code)

For each finding, provide the fix.
```

### `MEDIUM` — Third-Party Script Audit

```
Audit all third-party scripts and resources loaded by my application. Check:

1. List every external script, stylesheet, font, and image loaded
2. For each external resource:
   - Is it loaded over HTTPS?
   - Is Subresource Integrity (SRI) used?
   - What data does it have access to?
   - Is it a trusted provider?
   - What happens if the CDN is compromised?
3. Are there any analytics scripts that could be capturing keystrokes or PII?
4. Are there any advertising scripts?
5. Are there any embedded iframes from third parties?
6. Are third-party cookies in use? For what purpose?
7. Could any third-party script be replaced with a self-hosted version?

Create a table: | Script | Source | SRI? | Data Access | Risk | Recommendation |
```

---

## 10. Monitoring, Logging & Incident Response

### `HIGH` — Logging & Audit Trail Review

```
Audit my application's logging for security and compliance. Check:

1. **What IS logged**
   - Login attempts (success and failure) with IP, user agent, timestamp
   - Authorization failures (user tried to access something they can't)
   - Data modification events (who changed what, when)
   - Admin actions (user creation, role changes, config changes)
   - API errors and exceptions

2. **What should NOT be logged**
   - Passwords (even failed attempts)
   - Credit card numbers, SSN, or other PII
   - Authentication tokens or session IDs
   - API keys or secrets
   - Full request bodies containing sensitive data

3. **Log Security**
   - Are logs stored in a tamper-proof location?
   - Are logs encrypted at rest and in transit?
   - Can application code modify or delete logs?
   - Is there a log retention policy?
   - Are logs centralized (not just on the application server)?

4. **Alerting**
   - Are there alerts for: multiple failed logins, privilege escalation, unusual API usage, new admin accounts, data export events?
   - Who receives alerts? What is the response time SLA?
   - Are alerts tested regularly?

Produce a recommended logging schema and alert rules.
```

### `HIGH` — Incident Response Plan

```
Help me create a security incident response plan for my business. I need:

1. **Incident Classification**
   - Define severity levels (P1 Critical through P4 Low) with examples
   - What constitutes each level for my specific business (CRM data breach, server compromise, DDoS, etc.)

2. **Response Team**
   - Who is responsible for what? (Even if it's a small team or just me)
   - Escalation paths and contact information template
   - External resources: lawyer, PR, law enforcement, cloud provider support

3. **Response Procedures** (for each severity level)
   - Detection: How will we know an incident occurred?
   - Containment: Immediate steps to stop the bleeding
   - Eradication: Remove the threat
   - Recovery: Restore normal operations
   - Post-mortem: What happened and how to prevent it

4. **Communication Templates**
   - Customer notification template (data breach)
   - Internal team notification template
   - Regulatory notification template (if applicable)
   - Public statement template

5. **Checklists**
   - "We think we've been breached" — first 30 minutes
   - "Our server is compromised" — immediate actions
   - "Customer data may have been exposed" — legal and notification requirements
   - "We're being DDoSed" — mitigation steps

Make this practical and actionable, not theoretical.
```

### `MEDIUM` — Security Monitoring Setup

```
Design a security monitoring system for my application. I need:

1. **What to monitor**
   - Failed login attempts (threshold: X per minute per IP)
   - Successful logins from new locations/devices
   - Privilege escalation events
   - Database queries returning unusually large result sets
   - API error rate spikes
   - Outbound data transfer volume spikes
   - File system changes on the server
   - Process creation/execution anomalies
   - SSL certificate expiration approaching

2. **Alert Rules**
   - For each monitoring point, define: condition, threshold, severity, notification channel
   - Minimize false positives (realistic thresholds)

3. **Tools & Implementation**
   - What tools should I use? (Based on my stack and budget)
   - How to implement each monitoring point
   - Dashboard design for at-a-glance status

4. **Response Playbooks**
   - For each alert type, define the investigation and response steps

Provide implementation instructions specific to my tech stack.
```

---

## 11. Compliance & Governance

### `HIGH` — Insurance Industry Compliance Check

```
Audit my insurance CRM application for compliance with regulations relevant to insurance agents handling client data. Check against:

1. **State Insurance Regulations**
   - Data security requirements for insurance licensees
   - Client data retention and destruction requirements
   - Record-keeping requirements for policies and communications

2. **NAIC Insurance Data Security Model Law**
   - Information security program requirements
   - Risk assessment obligations
   - Incident response plan requirements
   - Third-party service provider oversight
   - Annual certification requirements

3. **HIPAA (if health insurance data is handled)**
   - PHI identification and protection
   - Minimum necessary standard
   - Business associate agreements
   - Breach notification requirements (60-day rule)

4. **State Privacy Laws (CCPA, state equivalents)**
   - Right to know, delete, opt-out
   - Data sale restrictions
   - Consumer request handling

5. **Gramm-Leach-Bliley Act (GLBA)**
   - Financial privacy rule (privacy notices)
   - Safeguards rule (security program)
   - Pretexting provisions

Produce a compliance matrix: | Requirement | Status | Gap | Remediation |
```

### `MEDIUM` — Data Retention & Destruction Policy

```
Help me create a data retention and destruction policy for my CRM. Address:

1. **Retention Schedules**
   - Active client records: How long after last interaction?
   - Inactive/closed client records: How long after closure?
   - Policy documents: How long after policy expiration?
   - Communication logs (emails, notes, messages): How long?
   - Activity logs and audit trails: How long?
   - Backup data: How long are old backups kept?

2. **Regulatory Minimums**
   - Insurance record-keeping requirements by state
   - Tax-related record requirements (7 years)
   - Litigation hold considerations

3. **Destruction Procedures**
   - How is data securely deleted from the database?
   - How are backups containing deleted data handled?
   - How are files and documents securely destroyed?
   - Is deletion verified and logged?
   - Who authorizes data destruction?

4. **Implementation**
   - Automated retention enforcement (scheduled jobs)
   - Manual review process for edge cases
   - Audit trail for all destruction events

Produce a policy document I can adopt and the technical implementation plan.
```

---

## 12. Supply Chain & Dependency Security

### `HIGH` — Dependency Vulnerability Audit

```
Audit all dependencies in my project for known security vulnerabilities. Run through:

1. **Direct Dependencies**
   - List every dependency and its version
   - Check each against CVE databases (NVD, GitHub Advisory, Snyk)
   - Flag any with critical or high severity vulnerabilities
   - Flag any that are unmaintained (no updates in 12+ months)
   - Flag any that have been deprecated

2. **Transitive Dependencies**
   - Identify the full dependency tree
   - Check transitive dependencies for vulnerabilities
   - Identify any dependency with a known supply chain compromise

3. **Lock File Integrity**
   - Is there a package-lock.json / yarn.lock / pnpm-lock.yaml?
   - Are integrity hashes present?
   - Are there any discrepancies between lock file and package.json?

4. **Remediation Plan**
   - For each vulnerable dependency: can it be updated? Is there a patch? Is there an alternative package?
   - For each unmaintained dependency: what is the replacement?
   - Priority order for fixes

Run: npm audit, snyk test, or equivalent and analyze the output.
```

### `MEDIUM` — Software Bill of Materials (SBOM)

```
Generate a complete Software Bill of Materials (SBOM) for my application:

1. **Runtime Dependencies**: Every package that runs in production
2. **Dev Dependencies**: Build tools, test frameworks, linters
3. **System Dependencies**: OS packages, runtime versions (Node.js, Python, etc.)
4. **Infrastructure**: Cloud services, databases, caches, queues
5. **Third-Party Services**: APIs, SaaS tools, analytics, monitoring

For each item:
| Component | Version | License | Last Updated | Known CVEs | Risk Level |

Flag any with:
- Non-permissive licenses (GPL in a proprietary product)
- Known vulnerabilities
- End-of-life versions
- Single maintainer (bus factor risk)
```

---

## 13. Social Engineering & Human Factors

### `HIGH` — Phishing Resilience Assessment

```
Help me assess and improve my organization's resilience to phishing attacks:

1. **Email Security Configuration**
   - Is SPF configured correctly?
   - Is DKIM configured and signing outbound emails?
   - Is DMARC set to reject/quarantine (not just monitor)?
   - Is there an email filtering/security gateway?

2. **Common Attack Scenarios for Insurance Agents**
   - Fake carrier/underwriter emails requesting policy information
   - Spoofed client emails requesting changes to beneficiary/banking info
   - Fake CRM login pages (credential harvesting)
   - Malicious attachments disguised as applications or policy documents
   - Business email compromise (fake boss asking for wire transfer)

3. **Awareness Training Plan**
   - What should agents be trained to recognize?
   - How often should training happen?
   - Simulated phishing test strategy

4. **Technical Controls**
   - Email banner warnings for external senders
   - Link rewriting/sandboxing
   - Attachment scanning
   - Domain impersonation detection
   - Reporting mechanism ("Report Phishing" button)

Produce a training outline and technical implementation plan.
```

### `MEDIUM` — Physical Security & Endpoint Audit

```
Audit the physical and endpoint security of my organization:

1. **Devices**
   - Are all laptops/desktops encrypted (FileVault, BitLocker)?
   - Is there a device management solution (MDM)?
   - Are OS and browser auto-updates enabled?
   - Is antivirus/endpoint detection running?
   - Are USB ports restricted?
   - What happens when a device is lost or stolen? (Remote wipe capability?)

2. **Access**
   - Are screens locked after inactivity?
   - Are strong passwords/biometrics required on devices?
   - Is MFA required for all business applications?
   - Are personal devices used for work? (BYOD policy?)

3. **Physical**
   - Who has access to the office/workspace?
   - Are documents with client info shredded?
   - Are screens visible to unauthorized people (coffee shops, open offices)?
   - Are physical files locked when not in use?

4. **Network**
   - Is Wi-Fi secured with WPA3/WPA2?
   - Is there a separate guest network?
   - Are agents using VPN on public Wi-Fi?

Produce a security checklist agents can self-audit monthly.
```

---

## 14. Penetration Testing Prompts

> **NOTE**: These prompts are for **authorized testing** of your own systems only. Always have written authorization before testing.

### `HIGH` — Reconnaissance & Information Gathering

```
I am conducting an authorized security assessment of my own application at [YOUR DOMAIN]. Help me with reconnaissance:

1. **Passive Reconnaissance**
   - What information is publicly available about my domain? (WHOIS, DNS records, subdomains)
   - Are there any exposed services discoverable via certificate transparency logs?
   - What technologies can be fingerprinted from HTTP headers and responses?
   - Are there any exposed configuration files (.env, .git, /server-status, /phpinfo)?
   - Are there any directory listings enabled?

2. **Active Reconnaissance**
   - What ports are open and what services are running?
   - What is the web server and its version?
   - What is the application framework and version?
   - Are there any exposed admin panels or login pages?
   - What API endpoints are discoverable?

3. **Attack Surface Mapping**
   - List every input point (forms, URL parameters, headers, cookies, file uploads)
   - List every authenticated vs unauthenticated endpoint
   - Identify the highest-value targets (admin functions, data export, payment processing)

Do NOT make any requests to systems — this is a planning exercise. Provide me with the commands and tools I would use to perform each step.
```

### `MEDIUM` — Web Application Test Plan

```
Create a comprehensive web application penetration test plan for my CRM application. Organize by:

1. **Pre-Test**
   - Define scope (which URLs, endpoints, features are in/out of scope)
   - Define rules of engagement (no data destruction, no denial of service, test hours)
   - Set up a test environment

2. **Authentication Testing**
   - Brute force login (with rate limit detection)
   - Default credentials check
   - Password reset flow testing
   - Session management testing (fixation, hijacking, timeout)
   - MFA bypass attempts

3. **Authorization Testing**
   - Horizontal privilege escalation (User A → User B's data)
   - Vertical privilege escalation (User → Admin)
   - Forced browsing (accessing URLs not linked in the UI)
   - Parameter manipulation (changing IDs, roles, prices)

4. **Injection Testing**
   - SQL injection on every input field
   - XSS on every output point
   - Command injection on any server-side input processing
   - SSTI on any template-rendered content

5. **Business Logic Testing**
   - Can workflow steps be skipped?
   - Can negative values be submitted where positive is expected?
   - Can race conditions be exploited?
   - Can actions be replayed?

6. **Reporting**
   - Finding template: Title, Severity, Description, Steps to Reproduce, Impact, Recommendation

Provide the test plan as a checklist I can work through systematically.
```

---

## 15. Security Hardening Checklists

### Node.js + Express Hardening

```
Generate a complete security hardening checklist for a Node.js/Express application in production:

1. Helmet.js configured with all security headers
2. Rate limiting on all routes (express-rate-limit)
3. Request body size limited (express.json({ limit: '10kb' }))
4. CORS properly configured (not wildcard)
5. Cookies: HttpOnly, Secure, SameSite
6. Input validation on every endpoint (Joi/Zod)
7. Parameterized database queries (no string concatenation)
8. Error handling: generic messages to client, details to logs
9. HTTPS enforced (redirect HTTP → HTTPS)
10. Dependencies audited (npm audit)
11. Node.js version current (LTS)
12. process.env for all secrets (never hardcoded)
13. Logging: structured, no PII, centralized
14. CSRF protection for cookie-based auth
15. File upload: type validation, size limit, sandboxed storage
16. Source maps disabled in production
17. X-Powered-By header removed
18. Trust proxy configured correctly if behind a reverse proxy
19. Graceful shutdown handling
20. Health check endpoint (not exposing sensitive info)

For each item, provide the exact code/config snippet.
```

### Database Hardening (PostgreSQL/MySQL/MongoDB)

```
Generate a security hardening checklist for my database (specify which: PostgreSQL, MySQL, or MongoDB):

1. Listen address restricted to private network
2. Strong authentication required (no trust/peer)
3. TLS/SSL required for all connections
4. Application uses a dedicated user with minimal privileges
5. Superuser/root access restricted and MFA'd
6. Default databases/users removed
7. Connection limits configured
8. Query logging enabled for writes and admin operations
9. Encryption at rest enabled
10. Automated backups with encryption
11. Point-in-time recovery configured
12. Unused extensions/features disabled
13. Latest security patches applied
14. Monitoring for slow queries and unusual access patterns
15. Network-level access restricted (security groups / firewall)

Provide the specific configuration for my database engine.
```

### Linux Server Hardening

```
Generate a complete Linux server hardening checklist for a production web server:

1. Automatic security updates enabled
2. SSH: key-only, no root login, non-default port, fail2ban
3. Firewall: default deny, only necessary ports open
4. Unused services disabled
5. Non-root user for the application
6. File permissions: no world-writable files, restrictive umask
7. /tmp mounted with noexec, nosuid
8. Audit daemon configured
9. Time synchronization (NTP)
10. Disk encryption
11. Kernel hardening (sysctl.conf)
12. GRUB password protection
13. Core dumps disabled
14. Banner warning on login
15. Account lockout policy
16. Password complexity requirements (for any local accounts)
17. Log rotation configured
18. Intrusion detection (AIDE, OSSEC, or similar)
19. Rootkit detection (rkhunter/chkrootkit)
20. SELinux/AppArmor configured

For each item, provide the exact command to check and fix.
```

---

## 16. Quick-Fire Diagnostic Prompts

Short prompts you can run fast for specific concerns:

### Immediate Threat Assessment

```
I think my application may have been compromised. Help me investigate. Walk me through:
1. What to check immediately (active sessions, recent logins, database changes)
2. How to determine if data was exfiltrated
3. How to contain the breach without destroying evidence
4. What to preserve for forensic analysis
My tech stack is [describe your stack].
```

### "Is This Vulnerability Real?" Triage

```
I received a vulnerability report / security alert about [describe the issue]. Help me triage it:
1. Is this a real vulnerability or a false positive?
2. What is the actual impact if exploited?
3. How urgent is the fix? (Can it wait for the next release or does it need a hotfix?)
4. What is the fix?
5. How do I verify the fix works?
```

### Pre-Deployment Security Gate

```
I am about to deploy a new version of my application. Run a pre-deployment security check:
1. Are there any new dependencies with known vulnerabilities?
2. Are there any hardcoded secrets in the code changes?
3. Are all new API endpoints properly authenticated and authorized?
4. Are all new user inputs validated?
5. Are all new database queries parameterized?
6. Are security headers still correctly configured?
7. Is error handling consistent (no information leakage)?
8. Are all new features covered by appropriate logging?
I will provide the diff/changeset.
```

### Post-Incident Security Review

```
We just resolved a security incident. Help me run a post-incident review:
1. What was the root cause?
2. How was it detected? Could it have been detected sooner?
3. How long was the exposure window?
4. What data was potentially affected?
5. What system changes were made during response?
6. What preventive measures should be implemented?
7. Do we need to notify anyone (users, regulators)?
8. What monitoring should be added to detect similar incidents?
The incident was: [describe what happened].
```

### New Employee/Contractor Security Onboarding

```
Generate a security onboarding checklist for a new team member joining my organization:
1. Account creation with least-privilege access
2. MFA enrollment
3. Device security requirements (encryption, password, updates)
4. Acceptable use policy acknowledgment
5. Security awareness training topics
6. Incident reporting procedures
7. Data handling expectations (what can/cannot be stored locally, shared, etc.)
8. Access review schedule
9. Offboarding trigger points (what gets revoked and when)
Make this specific to a small insurance agency using a cloud-hosted CRM.
```

### Monthly Security Health Check

```
Run a monthly security health check on my business. Walk me through checking:
1. Are all software/OS versions up to date?
2. Have any new CVEs been published for my dependencies?
3. Are SSL certificates valid (not expiring in <30 days)?
4. Are backups working and tested?
5. Have there been any unusual login patterns?
6. Are all user accounts still appropriate (no former employees with access)?
7. Are API keys/tokens being rotated on schedule?
8. Is disk usage reasonable (log files not filling up)?
9. Are monitoring/alerting systems functional?
10. Were there any security-related events in the logs this month?
Provide this as a repeatable checklist I can run monthly in 30 minutes.
```

### Vendor / Third-Party Risk Assessment

```
I am evaluating a new third-party service/vendor for my business. Help me assess their security:
1. Do they have SOC 2 / ISO 27001 certification?
2. What is their data encryption posture (at rest, in transit)?
3. Where is data stored geographically?
4. What is their incident response and breach notification process?
5. What access controls do they have?
6. Can I audit or request proof of their security practices?
7. What happens to my data if I terminate the service?
8. Do they use subprocessors? Who?
9. What is their uptime SLA and disaster recovery plan?
10. Do they have a bug bounty program or conduct regular pen tests?
The vendor is [name/describe the service].
```

---

## How to Run a Full Security Audit

For a comprehensive audit, run these prompts in order:

1. **Start here**: Infrastructure & Server Security (Section 1)
2. **Then**: OWASP Top 10 Full Scan (Section 2)
3. **Then**: Authentication System Audit (Section 3)
4. **Then**: Sensitive Data Exposure (Section 4)
5. **Then**: HTTP Security Headers + SSL/TLS (Section 5)
6. **Then**: API Security Full Audit (Section 6)
7. **Then**: Cloud IAM & Storage (Section 7)
8. **Then**: Database Access Control (Section 8)
9. **Then**: Client-Side Security (Section 9)
10. **Then**: Logging & Monitoring (Section 10)
11. **Then**: Compliance Check (Section 11)
12. **Then**: Dependency Audit (Section 12)
13. **Finally**: Use the monthly health check (Section 16) as ongoing maintenance

Estimated time to run the full audit: 4-8 hours spread across multiple Claude sessions.
