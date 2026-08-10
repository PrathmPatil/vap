import axios from 'axios';
import logger from '../config/logger.js';

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

export async function sendEmailNotification({ to, subject, text, html }) {
  const recipient = String(to || '').trim();
  if (!recipient) {
    return { channel: 'email', status: 'skipped', message: 'No email address' };
  }

  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const fromEmail =
    process.env.ALERT_FROM_EMAIL?.trim() ||
    process.env.SENDGRID_FROM_EMAIL?.trim() ||
    'prathmesh2818@gmail.com';

  if (apiKey) {
    try {
      await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: fromEmail },
          subject: subject || 'TrendTraders alert',
          content: [
            { type: 'text/plain', value: text || '' },
            ...(html ? [{ type: 'text/html', value: html }] : []),
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return { channel: 'email', status: 'sent', recipient };
    } catch (error) {
      logger.error(`Email alert failed: ${error.message}`);
      return {
        channel: 'email',
        status: 'failed',
        recipient,
        message: error.response?.data?.errors?.[0]?.message || error.message,
      };
    }
  }

  logger.info(`[email-alert] to=${recipient} subject=${subject} body=${text}`);
  return { channel: 'email', status: 'queued', recipient };
}

export async function sendWhatsAppNotification({ to, message }) {
  const recipient = digitsOnly(to);
  if (!recipient) {
    return { channel: 'whatsapp', status: 'skipped', message: 'No WhatsApp number' };
  }

  const body = String(message || '').trim();
  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();
  const webhookUrl = process.env.WHATSAPP_API_URL?.trim();
  const webhookToken = process.env.WHATSAPP_API_TOKEN?.trim();

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const from = twilioFrom.startsWith('whatsapp:')
        ? twilioFrom
        : `whatsapp:${twilioFrom}`;
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        new URLSearchParams({
          From: from,
          To: `whatsapp:+${recipient}`,
          Body: body,
        }),
        {
          auth: { username: twilioSid, password: twilioToken },
          timeout: 15000,
        }
      );
      return { channel: 'whatsapp', status: 'sent', recipient };
    } catch (error) {
      logger.error(`WhatsApp alert failed: ${error.message}`);
      return {
        channel: 'whatsapp',
        status: 'failed',
        recipient,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  if (webhookUrl) {
    try {
      await axios.post(
        webhookUrl,
        { to: recipient, message: body },
        {
          headers: webhookToken
            ? { Authorization: `Bearer ${webhookToken}` }
            : {},
          timeout: 15000,
        }
      );
      return { channel: 'whatsapp', status: 'sent', recipient };
    } catch (error) {
      logger.error(`WhatsApp webhook failed: ${error.message}`);
      return {
        channel: 'whatsapp',
        status: 'failed',
        recipient,
        message: error.message,
      };
    }
  }

  logger.info(`[whatsapp-alert] to=${recipient} body=${body}`);
  return { channel: 'whatsapp', status: 'queued', recipient };
}
