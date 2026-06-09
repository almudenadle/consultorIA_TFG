import { Resend } from 'resend';

// Inicializamos Resend. 
// Asumo que en tu .env sigues teniendo tu API Key (la que empieza por re_) en la variable EMAIL_PSSWD
const resend = new Resend(process.env.EMAIL_PSSWD);

interface EmailFileInfo {
  clientEmail: string;
  fileName: string;
  pdfData: string;
}

export class EmailService {
  public static async sendEmail(emailInfo: EmailFileInfo): Promise<void> {
    try {
      console.log("Iniciando envío de correo por API HTTP (Saltando bloqueo de Render)...");
      
      const { data, error } = await resend.emails.send({
        // OBLIGATORIO MIENTRAS ESTÉS EN PRUEBAS:
        from: 'Informe de Consultoría <onboarding@resend.dev>', 
        // OBLIGATORIO MIENTRAS ESTÉS EN PRUEBAS: Tu propio correo registrado en Resend
        to: emailInfo.clientEmail, 
        subject: "Informe de Consultoría - Tu reporte está listo",
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
            // Resend detecta automáticamente que es un base64, no hace falta especificar 'encoding'
          },
        ],
      });

      if (error) {
        console.error("Resend devolvió un error:", error);
        throw new Error(error.message);
      }

      console.log("¡Email enviado exitosamente! ID:", data?.id);
    } catch (error) {
      console.error("Error crítico enviando email:", error);
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}