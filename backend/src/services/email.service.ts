import { env } from '../config/env.js';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendViaResend(params: SendEmailParams): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const subject = 'Reset your Mumbai Fitness Mafia password';
  const text = [
    'You requested a password reset for Mumbai Fitness Mafia.',
    '',
    `Open this link to choose a new password (valid for 30 minutes):`,
    resetLink,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0E0E14">
      <h2 style="margin:0 0 12px">Reset your password</h2>
      <p>You requested a password reset for <strong>Mumbai Fitness Mafia</strong>.</p>
      <p><a href="${resetLink}" style="display:inline-block;background:#00E5C3;color:#001A14;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
      <p style="font-size:13px;color:#555">This link expires in 30 minutes. If you did not request this, ignore this email.</p>
      <p style="font-size:12px;color:#888;word-break:break-all">${resetLink}</p>
    </div>
  `;

  if (env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[email:dev] Password reset for ${to}: ${resetLink}`);
    if (!env.RESEND_API_KEY || env.NODE_ENV === 'test') return;
  }

  await sendViaResend({ to, subject, html, text });
}

export async function sendContactChangeCodeEmail(to: string, code: string): Promise<void> {
  const subject = 'Confirm your new email — Mumbai Fitness Mafia';
  const text = [
    'Use this code to confirm your new email address for Mumbai Fitness Mafia:',
    '',
    code,
    '',
    'This code expires in 10 minutes. If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0E0E14">
      <h2 style="margin:0 0 12px">Confirm your new email</h2>
      <p>Use this code to confirm your new email address:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
      <p style="font-size:13px;color:#555">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
    </div>
  `;

  if (env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[email:dev] Contact-change code for ${to}: ${code}`);
    if (!env.RESEND_API_KEY || env.NODE_ENV === 'test') return;
  }

  await sendViaResend({ to, subject, html, text });
}

export async function sendSignupVerificationEmail(to: string, code: string): Promise<void> {
  const subject = 'Verify your email — Mumbai Fitness Mafia';
  const text = [
    'Welcome to Mumbai Fitness Mafia.',
    '',
    'Use this code to verify your email address:',
    code,
    '',
    'This code expires in 10 minutes. If you did not create an account, you can ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0E0E14">
      <h2 style="margin:0 0 12px">Verify your email</h2>
      <p>Welcome to <strong>Mumbai Fitness Mafia</strong>. Enter this code in the app to finish creating your account:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
      <p style="font-size:13px;color:#555">This code expires in 10 minutes. If you did not create an account, ignore this email.</p>
    </div>
  `;

  if (env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[email:dev] Signup verification code for ${to}: ${code}`);
    if (!env.RESEND_API_KEY || env.NODE_ENV === 'test') return;
  }

  await sendViaResend({ to, subject, html, text });
}
