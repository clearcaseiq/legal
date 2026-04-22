# Integrations & Extensibility

This document outlines the integration categories supported/planned for the platform and serves as a placeholder for future implementation details, APIs, and vendor-specific connectors.

## Integration Categories

- Case management systems
- Document management
- E-signature
- Accounting systems
- Expert vendors
- Medical record providers
- Litigation finance platforms

## Notes

- Each integration should define: vendor, auth method, data flows, and sync cadence.
- Add webhooks and retry policies for inbound/outbound integrations.
- Prefer config-driven connectors to reduce bespoke code per vendor.

