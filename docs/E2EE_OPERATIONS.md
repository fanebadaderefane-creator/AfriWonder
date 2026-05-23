# E2EE Operations Guide

This document defines production operations for the end-to-end encryption layer.

## Runtime Flags

- `VITE_E2EE_STRICT_MODE=true|false`
  - `true` (default): incoming text messages that cannot be decrypted are not displayed as plaintext.
  - `false`: fallback behavior can show server text when no decrypted payload is available.
- `E2EE_ALERT_JOB_INTERVAL_MS`
  - Optional backend interval for proactive E2EE alert notifications to admin accounts.
  - Default: `300000` (5 minutes), minimum accepted: `60000` (1 minute).

## Key Lifecycle

- Device bootstrap is handled client-side through `ensureE2eeBootstrap()`.
- Signed prekey is rotated automatically (daily) through `/api/e2ee/devices/rotate-signed-prekey`.
- One-time prekeys are refilled automatically when `/api/e2ee/prekeys/health` reports low stock.

## Monitoring Endpoints

- Admin monitoring:
  - `GET /api/admin/monitoring/e2ee`
  - Returns:
    - `devices_registered`
    - `prekeys_available`
    - `envelopes_last_hour`
    - `envelopes_last_day`
    - `healthy`

## Proactive Alerting

- Background job: `startE2eeMonitoringAlertJob()`
- Trigger condition: `alerts.length > 0` in E2EE health snapshot.
- Delivery channel: in-app notifications to users with admin roles (`admin`, `super_admin`, `data_admin`, `finance_admin`).
- Anti-spam strategy:
  - Alerts are grouped by a normalized signature of active E2EE alert codes.
  - Same alert signature is throttled per admin account with a 30-minute cooldown.
- Recovery signal:
  - When E2EE returns healthy, a `e2ee_monitoring_recovered` notification is emitted once per admin and last alert signature (24h lookback).

## Retention Policy

- `e2ee_envelopes` retention policy is applied by data retention job.
- Default retention: 180 days.
- Cleanup runs through `applyRetentionPolicies()` and is scheduled by `startDataRetentionJob()`.

## Common Failure Modes

- **Prekeys exhausted**
  - Symptom: send succeeds but recipient cannot decrypt.
  - Action: check `/api/admin/monitoring/e2ee`, verify `prekeys_available`.
- **AAD mismatch rejection**
  - Symptom: envelope API returns 400.
  - Action: verify sender/recipient IDs and device IDs encoded in AAD match payload.
- **Sender device not registered**
  - Symptom: envelope API returns 403.
  - Action: force bootstrap on client (`ensureE2eeBootstrap`) and re-send.

## Incident Checklist

1. Check `/api/admin/monitoring/e2ee`.
2. Confirm prekey health for affected account/device.
3. Validate strict mode config in frontend environment.
4. Inspect recent envelope volume (`envelopes_last_hour`) for anomalies.
5. If needed, temporarily disable strict mode in frontend to reduce UX impact while restoring key health.
