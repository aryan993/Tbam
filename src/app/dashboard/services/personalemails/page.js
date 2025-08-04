'use client';
import { useState } from 'react';

export default function EmailTriggerPage() {
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const sendEmails = async () => {
    if (!date) return alert('Please select a date');
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/email/rotary3012/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ message: 'Error sending emails' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Send Rotary Emails</h2>
      <input
        type="date"
        className="border px-3 py-2 w-full mb-4"
        value={date}
        onChange={e => setDate(e.target.value)}
      />
      <button
        onClick={sendEmails}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Emails'}
      </button>

      {result && (
        <div className="mt-4 text-sm text-gray-700">
          <p><strong>Status:</strong> {result.message}</p>
          {result.count != null && <p><strong>Emails Sent:</strong> {result.count}</p>}
        </div>
      )}
    </div>
  );
}
