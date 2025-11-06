import { Resend } from "resend";
import { SignJWT, importJWK } from 'jose';

const resend = new Resend(process.env.RESEND_API_KEY);

// Department to email mapping
const departmentEmails = {
  "School (HOD/Dean)": process.env.SCHOOL_EMAIL || "hod@jecrc.edu.in",
  "Library": process.env.LIBRARY_EMAIL || "15anuragsingh2003@gmail.com",
  "Hostel": process.env.HOSTEL_EMAIL || "hostel.warden@jecrc.edu.in",
  "Mess": process.env.MESS_EMAIL || "mess.manager@jecrc.edu.in",
  "Canteen": process.env.CANTEEN_EMAIL || "canteen@jecrc.edu.in",
  "TPO": process.env.TPO_EMAIL || "tpo@jecrc.edu.in",
  "Alumni Association": process.env.ALUMNI_EMAIL || "alumni@jecrc.edu.in",
  "Accounts Department": process.env.ACCOUNTS_EMAIL || "accounts@jecrc.edu.in",
  "DY. Registrar Office": process.env.REGISTRAR_EMAIL || "dyregistrar@jecrc.edu.in",
  "Examination Cell": process.env.EXAM_CELL_EMAIL || "examcell@jecrc.edu.in",
  "Sports Department": process.env.SPORTS_EMAIL || "sports@jecrc.edu.in",
  // For testing, you can override any department email in .env.local
  // Example: LIBRARY_EMAIL=your.email@example.com
};

const getJwk = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }
    return {
        kty: 'oct',
        k: Buffer.from(secret).toString('base64'),
    };
};

async function createToken(payload) {
    const jwk = getJwk();
    const key = await importJWK(jwk, 'HS256');
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(key);
    return token;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      student_name = "",
      registration_no = "",
      contact_no = "",
      department = "Library",
      user_id,
      form_id,
    } = body || {};

    if (!user_id || !form_id) {
        return Response.json({ ok: false, error: "User ID and Form ID are required." }, { status: 400 });
    }

    // Generate a secure token
    const actionToken = await createToken({ user_id, form_id, department });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const actionUrl = new URL('/department/action', baseUrl);
    actionUrl.searchParams.set('token', actionToken);

    // Get the target email for the department
    const toEmail = departmentEmails[department];
    
    if (!toEmail) {
      console.warn(`No email address configured for department: ${department}`);
      return Response.json({ ok: false, error: `No email configured for ${department}` }, { status: 400 });
    }
    
    const fromEmail = process.env.RESEND_FROM || "JECRC No Dues <noreply@jecrc.edu.in>";

    const subject = `No Dues Request: ${student_name || "Unknown Student"}`;
    const text = `A student has requested No Dues clearance.\n\nStudent: ${student_name}\nRegistration No: ${registration_no}\nContact No: ${contact_no}\nDepartment: ${department}\n\nPlease review and take action: ${actionUrl.toString()}`;
    const html = `
      <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.6; background-color: #1a1a1a; color: #f0f0f0; padding: 20px; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid #333;">
        <h2 style="margin:0 0 12px; color: #fff;">No Dues Request Submitted</h2>
        <p style="margin:0 0 16px; color: #ccc;">A student has requested No Dues clearance. Please review and take action using the button below.</p>
        <table style="border-collapse:collapse; width: 100%; border: 1px solid #444; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
          <tbody>
            <tr><td style="padding:8px 12px;color:#aaa; border-bottom: 1px solid #444;">Student</td><td style="padding:8px 12px;font-weight:600; color: #fff; border-bottom: 1px solid #444;">${escapeHtml(student_name)}</td></tr>
            <tr><td style="padding:8px 12px;color:#aaa; border-bottom: 1px solid #444;">Registration No</td><td style="padding:8px 12px; color: #fff; border-bottom: 1px solid #444;">${escapeHtml(registration_no)}</td></tr>
            <tr><td style="padding:8px 12px;color:#aaa; border-bottom: 1px solid #444;">Contact No</td><td style="padding:8px 12px; color: #fff; border-bottom: 1px solid #444;">${escapeHtml(contact_no)}</td></tr>
            <tr><td style="padding:8px 12px;color:#aaa;">Department</td><td style="padding:8px 12px;font-weight:600; color: #fff;">${escapeHtml(department)}</td></tr>
          </tbody>
        </table>
        <a href="${actionUrl.toString()}" style="display: inline-block; background: #b22222; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px;">Review Request</a>
        <p style="margin-top: 16px; font-size: 12px; color: #888;">If the button doesn't work, copy and paste this URL into your browser:<br>${actionUrl.toString()}</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject,
      text,
      html,
    });

    if (result?.error) {
      return Response.json({ ok: false, error: result.error?.message || "Resend error" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

// Small helper to avoid HTML injection in the email body
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
