import { useEffect, useState } from 'react';
import { fetchAllPayments, submitToSwift, verifyPayment } from '../api/payments';
import type { Payment, User } from '../types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  verified: 'Verified',
  submitted: 'Submitted to SWIFT',
};

export function EmployeeDashboard({ user, csrfToken }: { user: User; csrfToken: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!csrfToken) return;
    fetchAllPayments(csrfToken)
      .then((res) => setPayments(res.payments))
      .catch((err) => setError((err as Error).message));
  }, [csrfToken]);

  async function handleVerify(paymentId: number) {
    setMessage('');
    setError('');
    try {
      await verifyPayment(csrfToken, paymentId);
      setPayments((current) =>
        current.map((p) => (p.id === paymentId ? { ...p, status: 'verified' } : p)),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSubmitToSwift() {
    setMessage('');
    setError('');
    setSubmitting(true);
    try {
      const result = await submitToSwift(csrfToken);
      setMessage(result.message);
      setPayments((current) =>
        current.map((p) => (p.status === 'verified' ? { ...p, status: 'submitted' } : p)),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const verifiedCount = payments.filter((p) => p.status === 'verified').length;
  const submittedCount = payments.filter((p) => p.status === 'submitted').length;

  return (
    <div className="grid two-col">
      <section className="card">
        <h2>Welcome, {user.fullName}</h2>
        <p>Review all customer payment transactions, verify SWIFT codes, and submit payments to the SWIFT network.</p>
      </section>

      <section className="card">
        <h2>Transaction overview</h2>
        <ul>
          <li>Total: <strong>{payments.length}</strong></li>
          <li>Pending review: <strong>{pendingCount}</strong></li>
          <li>Verified: <strong>{verifiedCount}</strong></li>
          <li>Submitted to SWIFT: <strong>{submittedCount}</strong></li>
        </ul>
        <button
          onClick={handleSubmitToSwift}
          disabled={submitting || verifiedCount === 0}
          className={verifiedCount === 0 ? 'btn-secondary' : ''}
        >
          {submitting ? 'Submitting…' : `Submit to SWIFT (${verifiedCount} verified)`}
        </button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card wide">
        <h2>All customer payments</h2>
        {payments.length === 0 ? (
          <p>No payments found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Beneficiary</th>
                  <th>Account</th>
                  <th>SWIFT code</th>
                  <th>Currency</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.createdAt).toLocaleString()}</td>
                    <td>{payment.customerName}</td>
                    <td>{payment.beneficiaryName}</td>
                    <td>{payment.beneficiaryAccount}</td>
                    <td>{payment.swiftCode}</td>
                    <td>{payment.currency}</td>
                    <td>{payment.amount.toFixed(2)}</td>
                    <td>{payment.reference}</td>
                    <td>
                      <span className={`status-badge status-${payment.status}`}>
                        {STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                    </td>
                    <td>
                      {payment.status === 'pending' ? (
                        <button className="btn-verify" onClick={() => handleVerify(payment.id)}>
                          Verified
                        </button>
                      ) : (
                        <span className="action-done">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
