'use client';

import { useState } from 'react';

export default function HomePage() {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/whatsapp', { method: 'POST' });
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error(error);
      setResponse({ success: false, error: error.message || 'Unknown error' });
    }

    setLoading(false);
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
      <h1>Send WhatsApp Message</h1>
      <button
        onClick={sendMessage}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: 5,
          cursor: 'pointer',
          opacity: loading ? 0.6 : 1,
          marginTop: 20,
        }}
      >
        {loading ? 'Sending...' : 'Send WhatsApp Message'}
      </button>

      {response && (
        <pre style={{ marginTop: 20, backgroundColor: '#f0f0f0', padding: 10, borderRadius: 5 }}>
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </main>
  );
}
