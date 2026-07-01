// Vercel Serverless Function (Node runtime).
// Sends transactional email notifications via Google Workspace SMTP
// (Gmail SMTP + App Password). Called from the frontend after a
// transfer request's status changes.
//
// Required environment variables (set in Vercel Project Settings):
//   GMAIL_USER          - the sending mailbox, e.g. notifications@back2back.org
//   GMAIL_APP_PASSWORD  - the 16-character App Password for that mailbox
//
import nodemailer from 'nodemailer'

interface NotifyRequestBody {
  to: string[]
  subject: string
  text: string
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { to, subject, text } = (req.body ?? {}) as NotifyRequestBody

  if (!to || !Array.isArray(to) || to.length === 0 || !subject || !text) {
    res.status(400).json({ error: 'Missing required fields: to[], subject, text' })
    return
  }

  const gmailUser = process.env.GMAIL_USER
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

  if (!gmailUser || !gmailAppPassword) {
    console.error('Missing GMAIL_USER / GMAIL_APP_PASSWORD environment variables')
    res.status(500).json({ error: 'Email is not configured on the server' })
    return
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })

    await transporter.sendMail({
      from: `Project Transit <${gmailUser}>`,
      to: to.join(', '),
      subject,
      text,
    })

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Failed to send notification email:', err)
    res.status(500).json({ error: 'Failed to send email' })
  }
}
