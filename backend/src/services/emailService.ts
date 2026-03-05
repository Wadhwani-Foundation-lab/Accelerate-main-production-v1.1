import { EmailClient } from '@azure/communication-email';

const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
const senderAddress = process.env.AZURE_EMAIL_SENDER || 'accelerate@wadhwanifoundation.org';

let emailClient: EmailClient | null = null;

function getEmailClient(): EmailClient {
    if (!emailClient) {
        if (!connectionString) {
            throw new Error('AZURE_COMMUNICATION_CONNECTION_STRING is not configured');
        }
        emailClient = new EmailClient(connectionString);
    }
    return emailClient;
}

export async function sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    plainText?: string
): Promise<void> {
    const client = getEmailClient();

    const message = {
        senderAddress,
        content: {
            subject,
            html: htmlBody,
            plainText: plainText || '',
        },
        recipients: {
            to: [{ address: to }],
        },
    };

    const poller = await client.beginSend(message);
    const result = await poller.pollUntilDone();
    console.log(`Email sent to ${to}, status: ${result.status}, id: ${result.id}`);
}

export async function sendPanelInvitationEmail(
    toEmail: string,
    founderName: string,
    ventureName: string
): Promise<void> {
    const subject = `Welcome to Wadhwani Accelerate ${ventureName} : Invitation to Panel Discussion`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1a365d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Wadhwani Accelerate</h1>
        </div>
        <div class="content">
            <p>Dear ${founderName},</p>
            <p>Congratulations! We are pleased to inform you that <strong>${ventureName}</strong> has been recommended for the Wadhwani Accelerate program and is moving to the Panel Review stage.</p>
            <p>You will soon receive an invitation to present your venture to our expert panel. This is an exciting step in your journey with Wadhwani Accelerate.</p>
            <p><strong>What to expect next:</strong></p>
            <ul>
                <li>A panel discussion will be scheduled where you will present your venture</li>
                <li>Our panel of experts will review your venture and provide feedback</li>
                <li>You will be notified of the panel's decision after the review</li>
            </ul>
            <p>In the meantime, please ensure your venture profile is up to date on the platform.</p>
            <p>Best regards,<br>Wadhwani Accelerate Team</p>
        </div>
        <div class="footer">
            <p>&copy; Wadhwani Foundation. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    const plainText = `Dear ${founderName},

Congratulations! We are pleased to inform you that ${ventureName} has been recommended for the Wadhwani Accelerate program and is moving to the Panel Review stage.

You will soon receive an invitation to present your venture to our expert panel.

What to expect next:
- A panel discussion will be scheduled where you will present your venture
- Our panel of experts will review your venture and provide feedback
- You will be notified of the panel's decision after the review

In the meantime, please ensure your venture profile is up to date on the platform.

Best regards,
Wadhwani Accelerate Team`;

    await sendEmail(toEmail, subject, htmlBody, plainText);
}
