import nodemailer from "nodemailer";

/**
 * Interface for email configuration data
 */
interface EmailFileInfo {
  clientEmail: string;
  fileName: string;
  pdfData: string;
}

/**
 * Service for sending emails with PDF attachments.
 * Uses nodemailer to send consulting reports via email.
 */
export class EmailService {
  /**
   * Sends an email with a PDF report attached.
   * Uses SMTP configuration from environment variables.
   *
   * @param emailInfo - Contains recipient email, filename, and PDF data in Base64
   * @returns Promise that resolves when email is sent successfully
   * @throws {Error} If email sending fails or SMTP configuration is invalid
   */
  public static async sendEmail(emailInfo: EmailFileInfo): Promise<void> {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST, // "smtp.gmail.com"
        port: parseInt(process.env.EMAIL_PORT || "465"),
        secure: true, // true para 465
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PSSWD,
        }
      });

      // En el from, pones tu email de Gmail
      const info = await transporter.sendMail({
        from: `Informe de Consultoría <${process.env.EMAIL_USER}>`,
        to: emailInfo.clientEmail,
        subject: "Informe de Consultoría - Tu reporte está listo",
        text: "Adjunto encontrarás el informe de consultoría solicitado.",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Informe de Consultoría</h2>
            <p>Estimado cliente,</p>
            <p>Adjunto a este correo encontrarás el informe de consultoría que has solicitado.</p>
            <p>El documento contiene un análisis detallado y las recomendaciones para tu empresa.</p>
            <br>
            <p>Saludos cordiales,</p>
            <p><strong>Equipo de Consultoría</strong></p>
          </div>
        `,
        attachments: [
          {
            filename: emailInfo.fileName,
            content: emailInfo.pdfData,
            contentType: "application/pdf",
            encoding: "base64",
          },
        ],
      });

      console.log("Email sent successfully:", info.messageId);
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
