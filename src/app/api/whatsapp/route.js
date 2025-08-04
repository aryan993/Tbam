// app/api/send-whatsapp/route.js

// app/api/send-whatsapp/route.js

import { NextResponse } from 'next/server';
import { supabase } from '@/app/utils/dbconnect';
import { formatFullDate } from "@/lib/utils";

export async function POST() {
  try {
    // Get today's IST date in YYYY-MM-DD
    const istNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const year = istNow.getFullYear();
    const month = String(istNow.getMonth() + 1).padStart(2, '0');
    const day = String(istNow.getDate()).padStart(2, '0');
    const normalizedDate = `2000-${month}-${day}`;
    const today = formatFullDate(`${year}-${month}-${day}`);
    console.log(today)

    const [birthdayData, spouseBirthdays, anniversaries] = await Promise.all([
      fetchByType(normalizedDate, 'member'),
      fetchByType(normalizedDate, 'spouse'),
      fetchByType(normalizedDate, 'anniversary'),
    ]);
    // Flatten all recipients into one array
    const allRecipients = [
      ...birthdayData.map(r => ({ id: r.id, phone: r.phone, type: 'birthday' })),
      ...spouseBirthdays.map(r => ({ id: r.id, phone: r.phone, type: 'birthday' })),
      ...anniversaries.map(r => ({ id: r.id, phone: r.phone, type: 'anniversary' })),
    ];

    console.log(`Total recipients to send: ${allRecipients.length}`);

    let sentCount = 0;

    // Send messages for each user
    for (const user of allRecipients) {
        console.log(`{"id": "${user.id}", "number":"${user.phone}", "type": "${user.type}"}`);
      const response = await fetch('http://localhost:3000/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.WHATSAPP_API_KEY || '', // Set in .env.local
        },
        body: JSON.stringify({
          number: isValidPhoneNumber(user.phone),
          id: user.id,
          type:user.type,
        }),
      });
      const result = await response.json();
      console.log(`Message sent to ${user.phone} (${user.type}):`, result);
      sentCount++;
    }

    return NextResponse.json({ success: true, totalSent: sentCount });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function fetchByType(dateStr, type) {
  try {
    let query = supabase.from('user');
    let processedData = [];

    if (type === 'member') {
      query = query.select('id, phone').eq('type', 'member').eq('dob', dateStr).eq('active', true);
    } else if (type === 'spouse') {
      query = query.select('id, phone').eq('type', 'spouse').eq('dob', dateStr).eq('active', true);
    } else if (type === 'anniversary') {
      query = query.select('id, phone, partner:partner_id (id, active)').eq('anniversary', dateStr).eq('active', true);
    } else {
      throw new Error("Invalid type provided");
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) return [];

    if (type === "anniversary") {
      processedData = data.filter(item => item.partner && item.partner.active === true);
    } else {
      processedData = data;
    }

    return processedData;
  } catch (err) {
    console.error(`fetchByType error [${type}]:`, err);
    return [];
  }
}

function isValidPhoneNumber(phone) {
    if (!phone) return null;

    // Remove spaces and non-digit characters
    const cleaned = phone.toString().replace(/\s+/g, '').replace(/\D/g, '');

    if (cleaned.length === 10) {
        return '91' + cleaned;
    } else if (cleaned.length > 10) {
        return '91' + cleaned.slice(-10);
    } else {
        return null;
    }
}

