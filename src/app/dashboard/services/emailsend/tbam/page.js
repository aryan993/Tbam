// pages/send-email.js
'use client';
import { useState } from 'react';

export default function SendEmailPage() {
  const [type, setType] = useState('test');
  const [date, setDate] = useState('');
  const [listOfEmails, setListOfEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/email/rotary3012/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          date: type === 'test' ? date : undefined,
          listOfEmails: ['test', 'advance'].includes(type) && listOfEmails
            ? listOfEmails.split(',').map(email => email.trim())
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unknown error');

      setResponse(`✅ Success: ${data.message || 'Emails sent'}`);
    } catch (err) {
      setResponse(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: 'Arial' }}>
      <h1>Send Birthday/Anniversary Email</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
        <label>
          Type:
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="test">Test</option>
            <option value="advance">Advance</option>
            <option value="realtime">Realtime</option>
          </select>
        </label>

        {type === 'test' && (
          <label>
            Date:
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required={type === 'test'}
            />
          </label>
        )}

        {['test', 'advance'].includes(type) && (
          <label>
            List of Emails (comma-separated):
            <textarea
              rows={3}
              value={listOfEmails}
              onChange={(e) => setListOfEmails(e.target.value)}
              placeholder="example1@gmail.com, example2@gmail.com"
            />
          </label>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Email'}
        </button>
      </form>

      {response && <p style={{ marginTop: 20 }}>{response}</p>}
    </div>
  );
}
