// Email service for password reset functionality
// This is a basic implementation that logs emails to console
// In production, you would integrate with services like SendGrid, AWS SES, or Nodemailer

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // Email service configuration
        this.useRealEmail = process.env.USE_REAL_EMAIL === 'true';
        this.transporter = null;

        if (this.useRealEmail) {
            this.setupTransporter();
        }
    }

    setupTransporter() {
        // Configure email transporter based on environment
        const emailService = process.env.EMAIL_SERVICE || 'gmail';

        if (emailService === 'gmail') {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
                }
            });
        } else if (emailService === 'sendgrid') {
            // SendGrid configuration
            this.transporter = nodemailer.createTransport({
                host: 'smtp.sendgrid.net',
                port: 587,
                secure: false,
                auth: {
                    user: 'apikey',
                    pass: process.env.SENDGRID_API_KEY
                }
            });
        }
    }

    async sendPasswordResetEmail(email, fullName, resetCode) {
        try {
            // Validate reset code
            if (!resetCode || typeof resetCode !== 'string' || resetCode.length !== 6) {
                console.error('Invalid reset code provided for password reset');
                return false;
            }

            const emailContent = this.generatePasswordResetEmail(fullName, resetCode);

            if (this.useRealEmail && this.transporter) {
                // Send real email
                return await this.sendRealEmail(email, 'Password Reset Code - Smart Garden', emailContent, resetCode);
            } else {
                // Log email to console (development mode)
                console.log('📧 Password Reset Email:');
                console.log('To:', email);
                console.log('Subject: Password Reset Code - Smart Garden');
                console.log('Content:', emailContent);
                console.log('Reset Code:', resetCode);
                console.log('---');
                return true;
            }
        } catch (error) {
            console.error('Error sending password reset email:', error);
            return false;
        }
    }

    async sendRealEmail(to, subject, content, resetCode) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: to,
                subject: subject,
                text: content,
                html: this.generateHTMLEmail(content, resetCode)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully:', result.messageId);
            return true;
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            return false;
        }
    }

    generatePasswordResetEmail(fullName, resetCode) {
        return `
Dear ${fullName},

You have requested to reset your password for your Smart Garden account.

Your reset code is: ${resetCode}

This code will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email. Your password will remain unchanged.

For security reasons, this code can only be used once. After you reset your password, this code will no longer work.

If you have any questions or need assistance, please contact our support team.

Best regards,
The Smart Garden Team

---
This is an automated message, please do not reply to this email.
        `.trim();
    }

    generateHTMLEmail(textContent, resetCode) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset - Smart Garden</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f4f7fa;
            margin: 0;
            padding: 0;
            color: #2d3a4a;
        }
        .container {
            max-width: 480px;
            margin: 40px auto;
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 2px 12px rgba(44, 62, 80, 0.08);
            overflow: hidden;
        }
        .header {
            background: #eaf6ef;
            color: #2d3a4a;
            padding: 28px 20px 18px 20px;
            text-align: center;
        }
        .logo {
            font-size: 30px;
            margin-bottom: 8px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            letter-spacing: 1px;
        }
        .header h2 {
            margin: 8px 0 0 0;
            font-size: 16px;
            font-weight: 400;
            opacity: 0.8;
        }
        .content {
            padding: 32px 24px 24px 24px;
            background: #fff;
        }
        .greeting {
            font-size: 17px;
            color: #2d3a4a;
            margin-bottom: 18px;
        }
        .description {
            color: #4a6572;
            margin-bottom: 24px;
            font-size: 15px;
        }
        .code-container {
            text-align: center;
            margin: 24px 0;
            padding: 18px 0;
            background: #f4f7fa;
            border-radius: 10px;
            border: 1px solid #e3e9ed;
        }
        .code-label {
            color: #4a6572;
            font-size: 13px;
            margin-bottom: 8px;
        }
        .code-value {
            color: #2d3a4a;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 6px;
            font-family: monospace;
            background: #eaf6ef;
            border-radius: 6px;
            padding: 8px 18px;
            display: inline-block;
        }
        .important {
            margin-top: 24px;
            padding: 16px;
            background: #fffbe6;
            border-radius: 8px;
            border-left: 4px solid #ffe082;
        }
        .important strong {
            color: #a67c00;
            font-size: 15px;
        }
        .important ul {
            margin: 12px 0 0 0;
            padding-left: 18px;
        }
        .important li {
            color: #a67c00;
            margin-bottom: 6px;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            padding: 22px 16px;
            background: #f4f7fa;
            border-top: 1px solid #e3e9ed;
        }
        .footer p {
            margin: 4px 0;
            color: #7b8a97;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌱</div>
            <h1>Smart Garden</h1>
            <h2>Password Reset Request</h2>
        </div>
        <div class="content">
            <div class="greeting">Dear ${textContent.split('Dear ')[1].split(',')[0]},</div>
            <div class="description">
                You have requested to reset your password for your Smart Garden account.<br>
                Enter the code below in your Smart Garden app.
            </div>
            <div class="code-container">
                <div class="code-label">Your Reset Code</div>
                <div class="code-value">${resetCode}</div>
            </div>
            <div class="important">
                <strong>Important Security Information:</strong>
                <ul>
                    <li>This code will expire in 1 hour for your security</li>
                    <li>This code can only be used once</li>
                    <li>If you didn't request this password reset, please ignore this email</li>
                    <li>Your password will remain unchanged unless you use this code</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            <p><strong>Best regards,</strong></p>
            <p>The Smart Garden Team</p>
            <p style="margin-top: 16px; font-size: 12px; color: #adb5bd;">
                This is an automated message, please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }
}

module.exports = new EmailService(); 