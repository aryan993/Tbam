// app/api/send-birthday-email/route.js
import { Storage } from 'megajs';
import nodemailer from 'nodemailer';
import { supabase } from "@/app/utils/dbconnect";
import { formatFullDate } from "@/lib/utils";

export async function POST(request) {
    try {
        const { MEGA_EMAIL, MEGA_PASSWORD, SMTP_USER, ELASTIC_KEY, EMAIL_TO, EMAIL_FROM, EMAIL_TEST } = process.env;
        if (!MEGA_EMAIL || !MEGA_PASSWORD || !SMTP_USER || !ELASTIC_KEY || !EMAIL_TO) {
            return Response.json({ message: 'Server configuration error' }, { status: 500 });
        }

        const { type, date, listOfEmails } = await request.json();

        //variables
        let email_date, email_subject, email_list;
        const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        //const email_list = EMAIL_TEST.split(',').map(email => email.trim());

        if (type === 'test') {
            email_date = `2000-${date.slice(5)}`;
            email_subject = `Birthday and Anniversary Notification ${formatFullDate(email_date)}`;
            email_list = listOfEmails || EMAIL_TEST.split(',').map(email => email.trim());
        }
        else if (type === 'realtime') {
            email_date = `2000-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
            email_subject = `Birthday and Anniversary Notification ${formatFullDate(email_date)}`;
            let allEmails = [];
            let pageSize = 1000;
            let from = 0;
            let to = pageSize - 1;
            let hasMore = true;

            while (hasMore) {
                const { data, error, count } = await supabase
                    .from('user')
                    .select('email', { count: 'exact' }) // include count to know total rows
                    .eq('active', true)
                    .range(from, to);

                if (error) throw error;

                allEmails = allEmails.concat(data.map(user => user.email));

                if (data.length < pageSize) {
                    hasMore = false; // no more data
                } else {
                    from += pageSize;
                    to += pageSize;
                }
            }

            // Remove duplicates, just in case
            email_list = [...new Set(allEmails)];
        }
        else if (type === 'advance') {
            nowIST.setDate(nowIST.getDate() + 1);
            email_date = `2000-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
            email_subject = `Advance Birthday and Anniversary Notification ${formatFullDate(email_date)}`;
            email_list = listOfEmails || EMAIL_TEST.split(',').map(email => email.trim());
        }

        console.log(`Email Date: ${email_date}`);
        console.log(`Email Subject: ${email_subject}`);
        console.log(`Email Count: ${email_list.length}`);

        const [birthdayData, spouseBirthdays, anniversaries] = await Promise.all([
            fetchByType(email_date, 'member'),
            fetchByType(email_date, 'spouse'),
            fetchByType(email_date, 'anniversary'),
        ]);

        const storage = new Storage({ email: MEGA_EMAIL, password: MEGA_PASSWORD });
        await new Promise((resolve, reject) => {
            storage.on('ready', resolve);
            storage.on('error', reject);
        });

        const files = storage.root.children || [];
        const attachments = [];

        const congratsFile = files.find(f => f.name === 'try.gif');
        let congratsCid = '';

        if (congratsFile) {
            const buffer = await new Promise((resolve, reject) => {
                const chunks = [];
                congratsFile.download()
                    .on('data', chunk => chunks.push(chunk))
                    .on('end', () => resolve(Buffer.concat(chunks)))
                    .on('error', reject);
            });

            congratsCid = 'congratulations-gif';
            attachments.push({
                filename: congratsFile.name,
                content: buffer,
                cid: congratsCid,
            });
        }

        const today = formatFullDate(email_date);

        let htmlTable = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      <meta name="x-apple-disable-message-reformatting" />
      <title>Birthday and Anniversary Notifications</title>
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; color: #333; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;">
      <!-- Main Container -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f7f7f7">
        <tr>
          <td align="center" valign="top">
            <!-- Email Container -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 900px;">
              ${congratsCid ? `
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <img src="cid:${congratsCid}" alt="Celebration Image" style="max-width: 100%; height: auto;" />
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 20px;">
                  <p style="margin: 0 0 15px 0; font-size: 16px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;">Dear Esteemed Rotary Leaders,</p>
                  <p style="margin: 0 0 15px 0; font-size: 16px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;">Warm greetings from the Rotary family of District 3012!</p>
                  <p style="margin: 0 0 15px 0; font-size: 16px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;">On behalf of District Governor <strong>Rtn. Dr. Amita Mohindru</strong> and the distinguished <strong>Rtn. Dr. Capt. Anil Mohindru</strong>, we take great pleasure in extending our heartfelt wishes to all those celebrating their birthdays and wedding anniversaries today.</p>
                  <p style="margin: 0 0 15px 0; font-size: 16px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;">May your day be filled with joy, good health, and cherished moments of togetherness. This simple gesture is a celebration of the spirit of fellowship that binds us all.</p>
                  <p style="margin: 0 0 30px 0; font-size: 16px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;">Stay blessed, stay healthy, and keep inspiring!</p>
    `;

        async function generateCardsSection(title, records, getDetailsFn, isAnniversary = false) {
            if (!records || records.length === 0) return '';

            let html = `
              <tr>
                <td style="padding: 10px 0;">
                  <h2 style="font-family: Arial, sans-serif; color: #333; margin: 0 0 15px 0; font-size: 20px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;">${title} on ${today}</h2>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <table width="100%" border="0" cellspacing="15" cellpadding="0">
                          <tr>
      `;

            // Split into two columns for desktop view
            let column1 = [];
            let column2 = [];
            records.forEach((record, index) => {
                if (index % 2 === 0) {
                    column1.push(record);
                } else {
                    column2.push(record);
                }
            });

            html += `<td width="50%" valign="top" style="padding: 0;">`;

            // Process first column
            for (const record of column1) {
                html += await generateCard(record, getDetailsFn, isAnniversary);
            }

            html += `</td>`;
            html += `<td width="50%" valign="top" style="padding: 0;">`;

            // Process second column
            for (const record of column2) {
                html += await generateCard(record, getDetailsFn, isAnniversary);
            }

            html += `</td>`;
            html += `</tr>`;

            html += `
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
      `;

            return html;
        }

        async function generateCard(record, getDetailsFn, isAnniversary = false) {
            const imageName = `${record.id}.jpg`;
            const partnerImageName = record?.partner?.id ? `${record.partner.id}.jpg` : null;
            const defaultImageName = '0.jpg';

            const file = files.find(f => f.name === imageName) || files.find(f => f.name === defaultImageName);
            const partnerFile = partnerImageName ? (files.find(f => f.name === partnerImageName) || files.find(f => f.name === defaultImageName)) : null;

            let mainCid = '';
            let partnerCid = '';

            if (file) {
                const buffer = await new Promise((resolve, reject) => {
                    const chunks = [];
                    file.download()
                        .on('data', chunk => chunks.push(chunk))
                        .on('end', () => resolve(Buffer.concat(chunks)))
                        .on('error', reject);
                });

                mainCid = file.name === defaultImageName ? 'default-image' : `image-${record.id}`;
                attachments.push({
                    filename: file.name,
                    content: buffer,
                    cid: mainCid,
                });
            }

            if (partnerFile) {
                const buffer = await new Promise((resolve, reject) => {
                    const chunks = [];
                    partnerFile.download()
                        .on('data', chunk => chunks.push(chunk))
                        .on('end', () => resolve(Buffer.concat(chunks)))
                        .on('error', reject);
                });

                partnerCid = partnerFile.name === defaultImageName ? 'default-image' : `image-${record.partner.id}`;
                attachments.push({
                    filename: partnerFile.name,
                    content: buffer,
                    cid: partnerCid,
                });
            }

            const details = getDetailsFn(record);

            // Improved name display with controlled line breaks
            const formatNameForDisplay = (name) => {
                if (!name) return '&nbsp;';

                // For anniversary cards with partner names
                if (isAnniversary && name.includes(' & ')) {
                    const [name1, name2] = name.split(' & ');
                    return `
        <span style="display: inline-block; width: 100%;">${toTitleCase(name1)} &</span>
        <span style="display: inline-block; width: 100%;">${toTitleCase(name2)}</span>
      `;
                }
                return toTitleCase(name);
            };

            // Always show 5 rows of data with compact layout
            const renderFields = (fields) => {
                const availableFields = fields.filter(f => f.value && f.value !== 'NULL');
                const rowsToShow = 5; // Fixed number of rows

                let html = '';
                for (let i = 0; i < rowsToShow; i++) {
                    const field = availableFields[i] || { label: '', value: '' };
                    let displayValue = field.value;

                    if (field.label === 'Email:' && field.value) {
                        displayValue = `<a href="mailto:${field.value}" style="color:inherit;text-decoration:underline;">${field.value}</a>`;
                    } else {
                        displayValue = toTitleCase(field.value);
                    }

                    html += `
        <tr>
          <td style="padding: 0; font-size: 14px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; height: 18px; line-height: 1;">
            <strong>${field.label || '&nbsp;'}</strong>${displayValue || '&nbsp;'}
          </td>
        </tr>
      `;
                }
                return html;
            };

            // Fixed size card with compact layout
            let cardHtml = `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px; background-color: #c4e6f8; border: 1px solid #a1cbe2; border-radius: 8px; overflow: hidden; height: 160px;">
      <tr>
        <td style="padding: 10px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="height: 100%;">
            <tr>
              <!-- Image Container with top margin (2 lines = ~16px) -->
              <td width="140" valign="top" style="padding-right: 10px; text-align: center;">
                <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block; margin-top: 16px;">
                  <tr>
                    ${mainCid ? `<td style="padding-right: ${partnerCid ? '5px' : '0'};"><img src="cid:${mainCid}" width="60" height="84" style="border-radius: 12px; object-fit: cover; display: block;" /></td>` : ''}
                    ${partnerCid ? `<td><img src="cid:${partnerCid}" width="60" height="84" style="border-radius: 12px; object-fit: cover; display: block;" /></td>` : ''}
                  </tr>
                </table>
              </td>
              
              <!-- Details Container -->
              <td valign="top">
                <table border="0" cellspacing="0" cellpadding="0" width="100%" style="height: 100%;">
                  <!-- Name row with improved wrapping -->
                  <tr>
                    <td style="padding: 8px 0 4px 0; height: 36px; vertical-align: top;">
                      <h3 style="font-family: Arial, sans-serif; font-size: 16px; margin: 0; color: #333; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; line-height: 1.3;">
                        ${formatNameForDisplay(details.name)}
                      </h3>
                    </td>
                  </tr>
                  
                  <!-- Data rows (compact layout) -->
                  <tr>
                    <td style="vertical-align: top; padding: 0;">
                      <table border="0" cellspacing="0" cellpadding="0" width="100%" style="line-height: 1;">
                        ${renderFields(details.extraFields)}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

            return cardHtml;
        }
        // Generate sections
        htmlTable += await generateCardsSection("Member's Birthday", birthdayData, (record) => ({
            name: record.name || '',
            extraFields: [
                { label: 'Post:', value: record.role },
                { label: 'Club:', value: record.club },
                { label: 'Phone:', value: record.phone },
                { label: 'Email:', value: record.email },
            ],
        }));

        htmlTable += await generateCardsSection("Partner's Birthday", spouseBirthdays, (record) => ({
            name: record.name || '',
            extraFields: [
                { label: "Partner:", value: record?.partner?.name },
                { label: 'Club:', value: record?.club },
                { label: 'Phone:', value: record.phone },
                { label: 'Email:', value: record.email },
            ],
        }));

        htmlTable += await generateCardsSection('Wedding Anniversary', anniversaries, (record) => ({
            name: `${record.name} & ${record?.partner?.name}` || '',
            extraFields: [
                { label: 'Post:', value: record.role },
                { label: 'Club:', value: record.club },
                { label: 'Phone:', value: record.phone },
                { label: 'Email:', value: record.email },
            ],
        }), true);

        // Footer with left-aligned logos (009, 006, 008) and centered TBAM section
        const logo006 = files.find(f => f.name === '006.jpg');
        let logo006Cid = '';
        if (logo006) {
            const buffer = await new Promise((resolve, reject) => {
                const chunks = [];
                logo006.download().on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
            });
            logo006Cid = 'logo-006';
            attachments.push({ filename: logo006.name, content: buffer, cid: logo006Cid });
        }

        const logo007 = files.find(f => f.name === '007.jpg');
        let logo007Cid = '';
        if (logo007) {
            const buffer = await new Promise((resolve, reject) => {
                const chunks = [];
                logo007.download().on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
            });
            logo007Cid = 'logo-007';
            attachments.push({ filename: logo007.name, content: buffer, cid: logo007Cid });
        }

        const logo008 = files.find(f => f.name === '008.jpg');
        let logo008Cid = '';
        if (logo008) {
            const buffer = await new Promise((resolve, reject) => {
                const chunks = [];
                logo008.download().on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
            });
            logo008Cid = 'logo-008';
            attachments.push({ filename: logo008.name, content: buffer, cid: logo008Cid });
        }

        const logo009 = files.find(f => f.name === '009.jpg');
        let logo009Cid = '';
        if (logo009) {
            const buffer = await new Promise((resolve, reject) => {
                const chunks = [];
                logo009.download().on('data', chunk => chunks.push(chunk)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject);
            });
            logo009Cid = 'logo-009';
            attachments.push({ filename: logo009.name, content: buffer, cid: logo009Cid });
        }

        htmlTable += `
              <tr>
                <td style="padding: 20px 0;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="border-top: 1px solid #ddd; padding: 20px 0;">
                        <p style="margin: 0 0 15px 0; font-size: 16px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%;">
                          With best wishes and regards,<br />
                          <strong>Team Influencer 2025-26</strong>
                        </p>
                        
                        <!-- Left-aligned logos (009, 006, 008) -->
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 10px 0;">
  <tr>
    <td align="left">
      <table border="0" cellspacing="0" cellpadding="0">
        <tr>
          ${logo009Cid ? `
          <td style="padding-right: 10px; vertical-align: middle;">
            <img src="cid:${logo009Cid}" style="max-height: 60px; display: block;" alt="Team Logo" />
          </td>` : ''}
          ${logo006Cid ? `
          <td style="padding-right: 10px; vertical-align: middle;">
            <img src="cid:${logo006Cid}" style="max-height: 60px; display: block;" alt="Team Logo" />
          </td>` : ''}
          ${logo008Cid ? `
          <td style="vertical-align: middle;">
            <img src="cid:${logo008Cid}" style="max-height: 60px; display: block;" alt="Team Logo" />
          </td>` : ''}
        </tr>
      </table>
    </td>
  </tr>
</table>

                        
                        <!-- Centered "Designed and Maintained by" section -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                          <tr>
                            <td align="center">
                              <table border="0" cellspacing="0" cellpadding="0" style="display: inline-block;">
                                <tr>
                                  <td style="padding: 10px 10px 10px 0; border: none;">
                                    ${logo007Cid ? `<img src="cid:${logo007Cid}" style="max-height: 60px;" alt="TBAM Logo" />` : ''}
                                  </td>
                                  <td style="border-left: 1px solid #000; padding: 10px; vertical-align: middle; border-top: none; border-bottom: none; border-right: none;">
                                    <p style="margin: 0; font-size: 12px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; color: #555; text-align: left;">
                                      <em>Designed and Maintained by</em><br />
                                      <strong>Tirupati Balaji Advertising & Marketing</strong><br />
                                      (Director of TBAM Group Rtn Dr Dheeraj Kumar Bhargava Ph:+919810522380)<br />
                                      Founder and Charter President of RC Indirapuram Galore<br />
                                      District Club Co-coordinator 2025-26
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 40px 0 0 0;">
                          <tr>
                            <td align="left" style="font-family: Arial, sans-serif; font-size: 12px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; color: #777;">
                              If you would prefer not to receive these emails, please
                              <strong>click the unsubscribe link at the bottom of this email</strong>.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

 // ✅ Setup email transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.elasticemail.com',
      port: 587,
      secure: false,
      auth: { user: SMTP_USER, pass: ELASTIC_KEY }
    });

    // ✅ Send in batches with tracking
    const { successCount, failureCount, failedRecipients } = await sendInBatches(email_list, 50, {
      transporter,
      html: htmlTable,
      attachments,
      EMAIL_FROM,
      today,
      email_subject
    });

    return Response.json({
      message: 'Emails processed',
      successCount,
      failureCount,
      failedRecipients
    });

    } catch (error) {
        console.error('Send email error:', error);
        return Response.json(
            { message: error.message || 'Failed to send email' },
            { status: 500 }
        );
    }
}

async function sendInBatches(recipients, batchSize, { transporter, html, attachments, EMAIL_FROM, today ,email_subject }) {
  let successCount = 0;
  let failureCount = 0;
  const failedRecipients = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const promises = batch.map(recipient =>
      transporter.sendMail({
        from: `"DG Dr. Amita Mohindru" <${EMAIL_FROM}>`,
        to: recipient,
        replyTo: 'amitadg2526rid3012@gmail.com, anilkmohindru@gmail.com',
        subject: email_subject,
        html,
        attachments,
        headers: {
          'X-ElasticEmail-Settings': JSON.stringify({
            UnsubscribeLinkText: '',
            UnsubscribeLinkType: 'None',
            Channels: 'birthday-email',
            IsTransactional: true,
            TrackOpens: true,
            TrackClicks: true
          })
        }
      }).then(() => {
        console.log("✅ Sent to", recipient);
        successCount++;
      }).catch(err => {
        console.error("❌ Failed to send to", recipient, err.message);
        failureCount++;
        failedRecipients.push({ email: recipient, error: err.message });
      })
    );

    await Promise.all(promises);
    await new Promise(r => setTimeout(r, 1000)); // Delay between batches
  }

  return { successCount, failureCount, failedRecipients };
}

async function fetchByType(date, type) {
    console.log(`Fetching data for type: ${type} on date: ${date}`);
    try {
        let query = supabase.from('user');
        let processedData = [];

        if (type === 'member') {
            query = query
                .select('id, name, club, phone, email, role')
                .eq('type', 'member')
                .eq('dob', date)
                .eq('active', true);
        } else if (type === 'spouse') {
            query = query
                .select('id, name, club, phone, email, partner:partner_id (id, name)')
                .eq('type', 'spouse')
                .eq('dob', date)
                .eq('active', true);
        } else if (type === 'anniversary') {
            query = query
                .select('id, name, club, email, phone, role, partner:partner_id (id, name, club, email, phone, active)')
                .eq('type', 'member')
                .eq('anniversary', date)
                .eq('active', true);
        } else {
            throw new Error("Invalid type provided");
        }
        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) return [];
        processedData = data;

        if (type === "anniversary") {
            const uniquePairs = new Set();
            processedData = data.filter((item) => {
                // Ensure both member and partner are active
                if (!item.partner || item.partner.active !== true) return false;

                const pairKey1 = `${item.id}-${item.partner.id}`;
                const pairKey2 = `${item.partner.id}-${item.id}`;
                if (uniquePairs.has(pairKey2)) return false;

                uniquePairs.add(pairKey1);
                return true;
            });
        }
        return processedData;
    } catch (err) {
        console.error("fetchByType error:", err);
        return [];
    }
}

function toTitleCase(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .split(' ')
        .map(word => {
            const lower = word.toLowerCase();
            if (lower === 'pdg') return 'PDG';
            if (lower === 'ca') return 'CA';
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}