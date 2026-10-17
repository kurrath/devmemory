// DevMemory — seed project memory. Loaded into Page Storage on first run so
// the demo opens with a meaningful graph (the auth/OAuth2 → 401 scenario the
// challenge describes, plus a checkout-timeout and stale-dashboard scenario).

import { ProjectMemory } from './types';

export const SEED_MEMORY: ProjectMemory = {
  nodes: [
    { id: 'proj', type: 'Project', label: 'Project: Helios API', detail: 'Customer-facing REST API platform.', createdAt: '2026-06-01T09:00:00Z' },

    { id: 'c_auth', type: 'Component', label: 'Component: Auth Module', detail: 'Issues and validates access tokens for all API routes.', createdAt: '2026-06-02T09:00:00Z' },
    { id: 'c_gateway', type: 'Component', label: 'Component: API Gateway', detail: 'Routes and authorizes every inbound request.', createdAt: '2026-06-02T09:00:00Z' },
    { id: 'c_checkout', type: 'Component', label: 'Component: Checkout Service', detail: 'Handles orders and payment capture.', createdAt: '2026-06-02T09:00:00Z' },
    { id: 'c_dash', type: 'Component', label: 'Component: Dashboard', detail: 'Reads aggregated metrics for end users.', createdAt: '2026-06-02T09:00:00Z' },

    { id: 'd_jwt', type: 'Dependency', label: 'Dependency: jsonwebtoken 9.x', detail: 'Signs and verifies JWTs. Upgraded from 8.x during the OAuth2 migration.', createdAt: '2026-09-28T09:00:00Z' },
    { id: 'd_redis', type: 'Dependency', label: 'Dependency: Redis cache', detail: 'Session store, token blacklist, and dashboard metrics cache.', createdAt: '2026-06-05T09:00:00Z' },
    { id: 'd_pg', type: 'Dependency', label: 'Dependency: Postgres pool', detail: 'Shared connection pool, capped at 20 connections.', createdAt: '2026-06-05T09:00:00Z' },

    { id: 'dec_oauth', type: 'Decision', label: 'Decision: Migrate to short-lived OAuth2 tokens', detail: 'Replaced 8-hour JWTs with 15-minute access tokens plus a refresh flow in the Auth Module. Rolled out 2026-09-28.', createdAt: '2026-09-28T10:00:00Z' },
    { id: 'dec_pool', type: 'Decision', label: 'Decision: Cap Postgres pool at 20', detail: 'Limited the shared connection pool to 20 to protect the database.', createdAt: '2026-08-11T10:00:00Z' },
    { id: 'dec_cache', type: 'Decision', label: 'Decision: Dashboard cache TTL = 5 minutes', detail: 'Cache aggregated metrics in Redis for 5 minutes.', createdAt: '2026-07-02T10:00:00Z' },

    { id: 'r_oauth', type: 'Reason', label: 'Reason: Reduce token-theft blast radius', detail: '8-hour tokens were a security risk; short-lived tokens limit exposure if one leaks.', createdAt: '2026-09-28T10:05:00Z' },
    { id: 'r_pool', type: 'Reason', label: 'Reason: DB CPU spikes past 20 connections', detail: 'Load testing showed instability beyond 20 concurrent connections.', createdAt: '2026-08-11T10:05:00Z' },
    { id: 'r_cache', type: 'Reason', label: 'Reason: Dashboard aggregation was slow', detail: 'Raw aggregation took ~4s; caching cut it to ~40ms.', createdAt: '2026-07-02T10:05:00Z' },

    { id: 'bug_401', type: 'Bug', label: 'Bug #412: Intermittent 401 Unauthorized after deploy', detail: 'Valid clients received 401 Unauthorized errors right after the OAuth2 rollout, intermittently.', createdAt: '2026-09-29T14:00:00Z' },
    { id: 'bug_timeout', type: 'Bug', label: 'Bug #388: Checkout 503 timeout under load', detail: 'Checkout requests timed out with 503 during peak traffic.', createdAt: '2026-08-20T14:00:00Z' },
    { id: 'bug_stale', type: 'Bug', label: 'Bug #351: Dashboard shows stale numbers', detail: 'Users saw outdated metrics on the dashboard for several minutes after data changed.', createdAt: '2026-07-15T14:00:00Z' },

    { id: 'fix_skew', type: 'Fix', label: 'Fix: Allow 30s clock skew in JWT verification', detail: 'Short 15-minute tokens were rejected when server clocks drifted. Added clockTolerance: 30 to jsonwebtoken verify.', createdAt: '2026-09-30T11:00:00Z' },
    { id: 'fix_pool', type: 'Fix', label: 'Fix: Dedicated connection pool for checkout', detail: 'Gave the checkout service its own 10-connection pool so it stopped starving under load.', createdAt: '2026-08-21T11:00:00Z' },
    { id: 'fix_invalidate', type: 'Fix', label: 'Fix: Invalidate dashboard cache on write', detail: 'Bust the Redis cache key on data change instead of waiting for the TTL to expire.', createdAt: '2026-07-16T11:00:00Z' },
  ],
  edges: [
    { id: 'e1', from: 'proj', to: 'c_auth', relation: 'HAS_COMPONENT' },
    { id: 'e2', from: 'proj', to: 'c_gateway', relation: 'HAS_COMPONENT' },
    { id: 'e3', from: 'proj', to: 'c_checkout', relation: 'HAS_COMPONENT' },
    { id: 'e4', from: 'proj', to: 'c_dash', relation: 'HAS_COMPONENT' },

    { id: 'e5', from: 'c_auth', to: 'd_jwt', relation: 'DEPENDS_ON' },
    { id: 'e6', from: 'c_auth', to: 'd_redis', relation: 'DEPENDS_ON' },
    { id: 'e7', from: 'c_gateway', to: 'c_auth', relation: 'CALLS' },
    { id: 'e8', from: 'c_checkout', to: 'd_pg', relation: 'DEPENDS_ON' },
    { id: 'e9', from: 'c_checkout', to: 'c_gateway', relation: 'CALLS' },
    { id: 'e10', from: 'c_dash', to: 'd_redis', relation: 'DEPENDS_ON' },
    { id: 'e11', from: 'c_dash', to: 'd_pg', relation: 'DEPENDS_ON' },

    { id: 'e12', from: 'dec_oauth', to: 'c_auth', relation: 'CHANGED' },
    { id: 'e13', from: 'dec_oauth', to: 'd_jwt', relation: 'CONFIGURED' },
    { id: 'e14', from: 'dec_oauth', to: 'r_oauth', relation: 'BECAUSE' },
    { id: 'e15', from: 'dec_oauth', to: 'bug_401', relation: 'INTRODUCED' },

    { id: 'e16', from: 'dec_pool', to: 'd_pg', relation: 'CONFIGURED' },
    { id: 'e17', from: 'dec_pool', to: 'r_pool', relation: 'BECAUSE' },
    { id: 'e18', from: 'dec_pool', to: 'bug_timeout', relation: 'CONTRIBUTED_TO' },

    { id: 'e19', from: 'dec_cache', to: 'd_redis', relation: 'CONFIGURED' },
    { id: 'e20', from: 'dec_cache', to: 'r_cache', relation: 'BECAUSE' },
    { id: 'e21', from: 'dec_cache', to: 'bug_stale', relation: 'CONTRIBUTED_TO' },

    { id: 'e22', from: 'bug_401', to: 'c_auth', relation: 'OCCURS_IN' },
    { id: 'e23', from: 'bug_401', to: 'd_jwt', relation: 'TRIGGERED_BY' },
    { id: 'e24', from: 'bug_401', to: 'fix_skew', relation: 'RESOLVED_BY' },

    { id: 'e25', from: 'bug_timeout', to: 'c_checkout', relation: 'OCCURS_IN' },
    { id: 'e26', from: 'bug_timeout', to: 'd_pg', relation: 'TRIGGERED_BY' },
    { id: 'e27', from: 'bug_timeout', to: 'fix_pool', relation: 'RESOLVED_BY' },

    { id: 'e28', from: 'bug_stale', to: 'c_dash', relation: 'OCCURS_IN' },
    { id: 'e29', from: 'bug_stale', to: 'd_redis', relation: 'TRIGGERED_BY' },
    { id: 'e30', from: 'bug_stale', to: 'fix_invalidate', relation: 'RESOLVED_BY' },
  ],
};
