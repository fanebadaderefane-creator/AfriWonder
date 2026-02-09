import { base44 } from "@base44/sdk";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// Send email notification
export async function sendEmailNotification(request) {
  const { to, subject, template, data } = request.body;

  try {
    const emailContent = generateEmailTemplate(template, data);

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject: subject
          }
        ],
        from: {
          email: "noreply@afriwonder.app",
          name: "AfriWonder"
        },
        content: [
          {
            type: "text/html",
            value: emailContent
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error("SendGrid API error");
    }

    return {
      success: true,
      message: "Email envoyé"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Order confirmation email
export async function sendOrderConfirmation(request) {
  const { orderId, userEmail, userName, items, totalAmount } = request.body;

  const template = `
    <h2>Commande confirmée!</h2>
    <p>Bonjour ${userName},</p>
    <p>Votre commande #${orderId} a été confirmée.</p>
    <ul>
      ${items.map(item => `<li>${item.title} x${item.quantity} - ${item.price} FCFA</li>`).join('')}
    </ul>
    <p><strong>Total: ${totalAmount} FCFA</strong></p>
    <p>Merci pour votre achat!</p>
  `;

  return sendEmailNotification({
    body: {
      to: userEmail,
      subject: `Commande confirmée #${orderId}`,
      template: "order_confirmation",
      data: { orderId, userName, items, totalAmount }
    }
  });
}

// Payment receipt email
export async function sendPaymentReceipt(request) {
  const { transactionId, userEmail, userName, amount, method, date } = request.body;

  return sendEmailNotification({
    body: {
      to: userEmail,
      subject: "Reçu de paiement",
      template: "payment_receipt",
      data: { transactionId, userName, amount, method, date }
    }
  });
}

// Password reset email
export async function sendPasswordResetEmail(request) {
  const { userEmail, userName, resetToken, resetLink } = request.body;

  return sendEmailNotification({
    body: {
      to: userEmail,
      subject: "Réinitialiser votre mot de passe",
      template: "password_reset",
      data: { userName, resetToken, resetLink }
    }
  });
}

// Email verification
export async function sendVerificationEmail(request) {
  const { userEmail, userName, verificationLink } = request.body;

  return sendEmailNotification({
    body: {
      to: userEmail,
      subject: "Vérifiez votre adresse email",
      template: "email_verification",
      data: { userName, verificationLink }
    }
  });
}

function generateEmailTemplate(template, data) {
  const templates = {
    order_confirmation: () => `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316, #ef4444); color: white; padding: 20px; border-radius: 8px; }
            .items { margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Commande confirmée!</h2>
            </div>
            <p>Bonjour ${data.userName},</p>
            <p>Votre commande <strong>#${data.orderId}</strong> a été confirmée.</p>
            <div class="items">
              <h3>Articles:</h3>
              ${data.items.map(item => `
                <div style="padding: 10px; border-bottom: 1px solid #eee;">
                  <p>${item.title} <strong>x${item.quantity}</strong> - ${item.price} FCFA</p>
                </div>
              `).join('')}
            </div>
            <p style="font-size: 18px; font-weight: bold; color: #f97316;">
              Total: ${data.totalAmount} FCFA
            </p>
            <div class="footer">
              <p>Merci d'avoir choisi AfriWonder!</p>
            </div>
          </div>
        </body>
      </html>
    `,
    payment_receipt: () => `
      <!DOCTYPE html>
      <html>
        <body>
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial;">
            <h2>Reçu de paiement</h2>
            <p>Bonjour ${data.userName},</p>
            <p>Votre paiement a été traité avec succès.</p>
            <ul>
              <li>Montant: ${data.amount} FCFA</li>
              <li>Méthode: ${data.method}</li>
              <li>Date: ${data.date}</li>
              <li>ID Transaction: ${data.transactionId}</li>
            </ul>
          </div>
        </body>
      </html>
    `,
    password_reset: () => `
      <!DOCTYPE html>
      <html>
        <body>
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial;">
            <h2>Réinitialiser votre mot de passe</h2>
            <p>Bonjour ${data.userName},</p>
            <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:</p>
            <a href="${data.resetLink}" style="display: inline-block; padding: 10px 20px; background: #f97316; color: white; text-decoration: none; border-radius: 4px;">
              Réinitialiser le mot de passe
            </a>
            <p style="color: #999; font-size: 12px;">Ce lien expire dans 24 heures.</p>
          </div>
        </body>
      </html>
    `,
    email_verification: () => `
      <!DOCTYPE html>
      <html>
        <body>
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial;">
            <h2>Vérifier votre adresse email</h2>
            <p>Bonjour ${data.userName},</p>
            <p>Cliquez sur le lien ci-dessous pour vérifier votre adresse email:</p>
            <a href="${data.verificationLink}" style="display: inline-block; padding: 10px 20px; background: #f97316; color: white; text-decoration: none; border-radius: 4px;">
              Vérifier l'email
            </a>
          </div>
        </body>
      </html>
    `
  };

  return templates[template] ? templates[template]() : "";
}