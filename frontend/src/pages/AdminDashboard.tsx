import { useEffect, useMemo, useState } from 'react';
import { fetchRecentAuditEntries, type AuditEntry } from '../api/audit';
import type { User } from '../types';

const HIGH_PRIORITY_EVENTS = new Set([
  'login_blocked_account_locked',
  'register_attempt_blocked',
  'audit_access_denied',
  'login_failed',
  'login_validation_failed',
  'payment_validation_failed',
  'register_validation_failed',
]);

function badgeClassFor(event: string) {
  if (HIGH_PRIORITY_EVENTS.has(event)) return 'status-pending';
  if (event === 'audit_log_viewed') return 'status-submitted';
  return 'status-verified';
}

export function AdminDashboard({ user }: { user: User }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  async function load() {
    setError('');
    setLoading(true);
    try {
      const res = await fetchRecentAuditEntries(100);
      setEntries(res.entries);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const counts = useMemo(() => {
    const out = { highPriority: 0, success: 0, total: entries.length };
    for (const entry of entries) {
      if (HIGH_PRIORITY_EVENTS.has(entry.event)) out.highPriority += 1;
      else out.success += 1;
    }
    return out;
  }, [entries]);

  return (
    <div className="grid two-col">
      <section className="card">
        <h2>Welcome, {user.fullName}</h2>
        <p>
          Administrator console — read-only access to the append-only security audit trail.
          You cannot view customer payments, verify transactions, or submit to SWIFT;
          those duties belong to bank employees. This separation enforces least privilege.
        </p>
      </section>

      <section className="card">
        <h2>Audit summary (last 100 events)</h2>
        <ul>
          <li>Total events: <strong>{counts.total}</strong></li>
          <li>High-priority (failures / blocked / denied): <strong>{counts.highPriority}</strong></li>
          <li>Routine successes: <strong>{counts.success}</strong></li>
        </ul>
        <div className="button-row">
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh now'}
          </button>
          <button
            className={autoRefresh ? '' : 'btn-secondary'}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? 'Auto-refresh on (10s)' : 'Enable auto-refresh'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card wide">
        <h2>Recent security events</h2>
        <p className="field-hint">
          Append-only audit log — login attempts, blocked registrations, account lockouts,
          payment lifecycle, SWIFT submissions, and audit-viewer access itself. Newest first.
        </p>
        {entries.length === 0 && !loading && !error && <p>No audit events recorded yet.</p>}
        {entries.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Event</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => {
                  const { timestamp, event, ...rest } = entry;
                  return (
                    <tr key={`${timestamp}-${idx}`}>
                      <td>{new Date(timestamp).toLocaleString()}</td>
                      <td><span className={`status-badge ${badgeClassFor(event)}`}>{event}</span></td>
                      <td><code style={{ fontSize: '0.85em' }}>{JSON.stringify(rest)}</code></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
