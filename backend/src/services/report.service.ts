import { DB } from "../config/typeorm";
import { Consulting } from "../entities/consulting.entity";
import { ConsultingKpiArea } from "../entities/consulting_kpi_area.entity";
import { Report } from "../entities/report.entity";
import { KeyRecommendation } from "../entities/key_recommendation.entity";
import { Form } from "../entities/form.entity";
import { GroqClient } from "./groq.client";
import * as fs from 'fs';
import * as path from 'path';
import {
  IReportToSend,
  IKeyRecommendation,
} from "../models/interfaces/report_data.interface";
import {
  ProposalSchema,
  AllAreasProposalSchema,
  proposalResponseFormat,
  allAreasProposalResponseFormat,
  ProposalResponse,
  AllAreasProposalResponse,
} from "../models/schemas/groq_schemas";
import { ConsultingStatus } from "../models/enums/consulting_status.enum";
import { IPdfReportData } from "../models/interfaces/pdf_report.interface";
import { jsPDF } from "jspdf";

/**
 * Type for PDF color palette
 */
type ColorPalette = {
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  lightGray: [number, number, number];
  darkGray: [number, number, number];
  white: [number, number, number];
  warning: [number, number, number];
};

/**
 * Service for generating and managing final consulting reports.
 * Handles AI-powered proposal generation, validation, and persistence.
 */
export class ReportService {
  private static readonly consultingRepo = DB.getRepository(Consulting);
  private static readonly consultingKpiAreaRepo =
    DB.getRepository(ConsultingKpiArea);
  private static readonly reportRepo = DB.getRepository(Report);
  private static readonly keyRecommendationRepo =
    DB.getRepository(KeyRecommendation);
  private static readonly formRepo = DB.getRepository(Form);
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 2000;

public static async generateReport(
    consultingId: number,
    userId: number,
  ): Promise<IReportToSend> {
    try {
      console.log("[REPORT GENERATION] Starting report generation", {
        consultingId,
        userId,
      });

      // Fetch consulting with all related data
      const consulting = await this.consultingRepo.findOne({
        where: { id: consultingId },
        relations: ["user", "user.company", "forms", "report", "areas"],
      });

      if (!consulting) {
        throw new Error(`Consulting ${consultingId} not found`);
      }

      if (consulting.user.id !== userId) {
        throw new Error(
          "Access denied: You do not own this consulting session",
        );
      }

      if (consulting.report) {
        throw new Error("Report already exists for this consulting session");
      }

      console.log("[REPORT GENERATION] Consulting snapshot", {
        consultingId: consulting.id,
        areas: consulting.areas?.length ?? 0,
        forms: consulting.forms?.length ?? 0,
        existingReport: Boolean(consulting.report),
      });

      // Build comprehensive context for the AI from the database summaries
      const contextPrompt = this.buildReportContext(consulting);

      console.log("[REPORT GENERATION] Prompt prepared", {
        consultingId,
        promptLength: contextPrompt.length,
        areaCount: consulting.areas?.length ?? 0,
      });

      // Request proposal from Groq Chat Completions with retries
      const proposalResponse = await this.requestProposalFromAI(contextPrompt);

      // Create and save the report entity (without recommendations)
      const report = this.reportRepo.create({
        summary: proposalResponse.summary,
        proposal: proposalResponse.proposal,
        conclusion: proposalResponse.conclusion,
        estimatedImpact: proposalResponse.estimatedImpact,
        consulting: consulting,
        user: consulting.user,
      });

      const savedReport = await this.reportRepo.save(report);

      console.log("[REPORT GENERATION] Report persisted", {
        consultingId,
        reportId: savedReport.id,
      });

      // Persist each key recommendation as an independent record
      const savedRecommendations: IKeyRecommendation[] = [];
      for (const rec of proposalResponse.keyRecommendations) {
        const recEntity = this.keyRecommendationRepo.create({
          title: rec.title,
          description: rec.description,
          labels: rec.labels,
          reportId: savedReport.id,
        });
        const savedRec = await this.keyRecommendationRepo.save(recEntity);
        savedRecommendations.push({
          id: savedRec.id,
          title: savedRec.title,
          description: savedRec.description,
          labels: savedRec.labels,
          reportId: savedRec.reportId,
        });
      }

      console.log("[REPORT GENERATION] Key recommendations persisted", {
        consultingId,
        reportId: savedReport.id,
        count: savedRecommendations.length,
      });

      // Update consulting status to FINISHED
      await this.consultingRepo.update(
        { id: consultingId },
        { statusCons: ConsultingStatus.FINISHED },
      );

      // Return structured response for frontend
      return {
        reportId: savedReport.id,
        summary: proposalResponse.summary,
        proposal: proposalResponse.proposal,
        conclusion: proposalResponse.conclusion,
        keyRecommendations: savedRecommendations,
        estimatedImpact: proposalResponse.estimatedImpact,
        createdAt: savedReport.createdAt,
      };
    } catch (error) {
      console.error("Error generating report:", error);
      throw error;
    }
  }
  /**
   * Builds a comprehensive context prompt for the AI assistant.
   * Includes company info, detected areas, KPI data, and all user responses.
   *
   * @param consulting - The consulting entity with all relations loaded
   * @returns A formatted prompt string with complete context
   */
  private static buildReportContext(consulting: Consulting): string {
    const areas = consulting.areas ?? [];

    let prompt = `*** ACTIVAR [FASE: PROPUESTA FINAL] *** \n\n`;

    // Add area analysis from consulting_kpi_area table
    if (areas.length > 0) {
      prompt += `## ÁREAS ANALIZADAS Y DIAGNÓSTICO \n\n`;

      areas.forEach((area, index) => {
        prompt += `**Área ${index + 1}: ${area.name}** \n
        - Puntuación Final: ${area.actualScore}/10 \n
        - Puntuación Anterior: ${area.previousScore}/10 \n
        - Estado: ${area.status} \n
        - Número de preguntas: ${area.numQuestions} \n
        - Resumen del diagnóstico: ${area.summary}\n\n`;
      });
    }

    prompt += `## INSTRUCCIONES FINALES\n\n`;
    prompt += `Genera la propuesta final así como la conclusión basándote en estas áreas y todo\n`;
    prompt += `lo discutido durante la sesión. Ten en cuenta todas las instrucciones a nivel de sistema de como genera estos campos.\n`;
    prompt += `Utiliza el formato estructurado JSON requerido por el schema.\n`;

    return prompt;
  }

  /**
   * Generates commercial proposals for all detected areas in a single API call.
   * Each proposal is written as flowing executive Spanish paragraphs oriented to sell
   * a third-party product or service.
   *
   * @param consulting - The consulting entity with areas loaded
   */
public static async generateAndSaveAreaProposals(
    consulting: Consulting,
  ): Promise<void> {
    if (!consulting.areas || consulting.areas.length === 0) {
      console.warn("No areas to generate proposals for");
      return;
    }

    const groq = GroqClient.getInstance();

    try {
      const allAreasPrompt = this.buildAllAreasProposalPrompt(consulting.areas);

      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        max_completion_tokens:
          Number(process.env.GROQ_MAX_COMPLETION_TOKENS) || 4096,
        messages: [
          {
            role: "user",
            content: allAreasPrompt,
          },
        ],
        response_format: allAreasProposalResponseFormat,
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error("No text response from Groq for area proposals");
      }

      const cleanContent = rawContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const jsonResponse = JSON.parse(cleanContent);
      const validated: AllAreasProposalResponse =
        AllAreasProposalSchema.parse(jsonResponse);

      // Map and persist each proposal to its corresponding area
      for (const proposalData of validated.areaProposals) {
        const matchingArea = consulting.areas.find(
          (area) => area.areaId === proposalData.areaId,
        );

        if (matchingArea) {
          await this.consultingKpiAreaRepo.update(
            { id: matchingArea.id },
            { proposal: proposalData.proposal },
          );
        } else {
          throw Error(`No area found for the matching area ID: ${proposalData.areaId}`);
        }
      }
    } catch (err) {
      console.error("Error generating proposals for all areas:", err);
      throw err;
    }
  }

  /**
   * Builds the prompt to request commercial proposals for all detected areas in one call.
   *
   * @param areas - Array of ConsultingKpiArea entities
   * @returns Formatted prompt string with all areas context
   */
  private static buildAllAreasProposalPrompt(
    areas: ConsultingKpiArea[],
  ): string {
    let prompt = `ACTIVAR [FASE: PROPUESTA POR ÁREA]\n\n`;
    prompt += `Has completado el diagnóstico de las siguientes áreas problemáticas. `;
    prompt += `Ahora debes generar UNA propuesta comercial ejecutiva para CADA una de ellas.\n\n`;
    prompt += `ÁREAS DETECTADAS:\n`;
    prompt += `${"-".repeat(80)}\n\n`;

    areas.forEach((area, index) => {
      prompt += `${index + 1}. Área: "${area.name}" (ID: ${area.areaId})\n`;
      prompt += `   Puntuación: ${area.actualScore}/10\n`;
      prompt += `   Diagnóstico:\n   ${area.summary}\n\n`;
    });

    prompt += `${"-".repeat(80)}\n\n`;
    prompt += `## INSTRUCCIONES PARA PROPUESTAS POR ÁREA\n\n`;
    prompt += `Genera UNA propuesta comercial ejecutiva para CADA área listada arriba siguiendo estas directrices:\n\n`;
    prompt += `**Formato y Estilo:**\n`;
    prompt += `- Escribe en párrafos continuos (prosa ejecutiva), sin listas, numeración ni subtítulos\n`;
    prompt += `- Idioma: Castellano de España (tono de Senior Partner en consultora de primer nivel)\n`;
    prompt += `- Extensión por área: 300-1500 caracteres\n\n`;
    prompt += `**Estructura narrativa recomendada:**\n`;
    prompt += `1. Inicia con el Costo de la Inacción (crear urgencia basada en el diagnóstico)\n`;
    prompt += `2. Presenta la Solución Ideal (herramientas, software o servicios de agencias externas específicos)\n`;
    prompt += `3. Destaca los Beneficios Esperados (tiempo ahorrado, ingresos incrementados, errores reducidos)\n`;
    prompt += `4. Cierra con Próximos Pasos claros (invitación a agendar llamada estratégica con nuestro equipo)\n\n`;
    prompt += `**Objetivo comercial:**\n`;
    prompt += `- Posicionar soluciones tecnológicas y servicios profesionales como NECESARIOS (no opcionales)\n`;
    prompt += `- Actuar como mecanismo de Lead Magnet para agendar consultoría especializada\n\n`;
    prompt += `**Formato de salida:**\n`;
    prompt += `Devuelve un objeto JSON con el array 'areaProposals' conteniendo un objeto por cada área con los campos 'areaId' (número) y 'proposal' (texto narrativo).\n`;

    return prompt;
  }

  /**
   * Requests a proposal from the OpenAI Assistant with retry logic.
   * Validates the response using the ProposalSchema.
   *
   * @param threadId - The existing thread ID from the consulting session
   * @param contextPrompt - The formatted context prompt
   * @returns Validated proposal response from the AI
   * @throws {Error} If maximum retries exceeded or validation fails
   */
 private static async requestProposalFromAI(
  contextPrompt: string,
): Promise<ProposalResponse> {
  const groq = GroqClient.getInstance();
  let attempts = 0;
  const startTime = Date.now();

  console.log("[DEBUG REPORTE] Iniciando solicitud de reporte en Groq.");

  while (attempts < this.MAX_RETRIES) {
    try {
      const attemptStart = Date.now();
      
      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        max_completion_tokens: Number(process.env.GROQ_MAX_COMPLETION_TOKENS) || 4096,
        messages: [{ role: "user", content: contextPrompt }],
        response_format: proposalResponseFormat,
      });

      console.log(`[DEBUG REPORTE] Tiempo de respuesta de Groq (Intento ${attempts + 1}): ${(Date.now() - attemptStart) / 1000}s`);
      console.log("[DEBUG REPORTE] Motivo de finalización de Groq:", completion.choices[0]?.finish_reason);

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No text response from Groq");

      const cleanContent = rawContent
        .replace(/^```json\s*/i, "")
        .replace(/^
```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      // Verificar si el JSON se parsea correctamente antes de enviarlo a Zod
      let jsonResponse;
      try {
        jsonResponse = JSON.parse(cleanContent);
      } catch (jsonErr: any) {
        console.error("[DEBUG REPORTE] El JSON de Groq vino defectuoso o incompleto (posible truncamiento de tokens).");
        console.error("[DEBUG REPORTE] Contenido recibido truncado:", cleanContent.substring(cleanContent.length - 200));
        throw jsonErr;
      }

      // Validar con Zod
      try {
        const validatedResponse = ProposalSchema.parse(jsonResponse);
        console.log(`[DEBUG REPORTE] Reporte generado con éxito en ${(Date.now() - startTime) / 1000}s totales.`);
        return validatedResponse;
      } catch (zodErr: any) {
        console.error("[DEBUG REPORTE] Error de validación en el Schema de Zod (ProposalSchema):", zodErr.errors || zodErr);
        throw zodErr;
      }

    } catch (error: any) {
      attempts++;
      console.error(`[DEBUG REPORTE] Intento ${attempts} fallido. Error general:`, error.message);

      if (attempts >= this.MAX_RETRIES) {
        throw new Error(`Failed to generate proposal after ${this.MAX_RETRIES} attempts.`);
      }
      await this.sleep(this.RETRY_DELAY_MS);
    }
  }

  throw new Error("Unexpected error in proposal generation");
}

  /**
   * Utility function to pause execution for a specified duration.
   * Used for implementing retry delays.
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the specified delay
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retrieves an existing report by consulting ID.
   * Validates user ownership before returning the report.
   *
   * @param consultingId - The consulting session ID
   * @param userId - The authenticated user's ID
   * @returns The report data or null if not found
   * @throws {Error} If access is denied
   */
  public static async getReportByConsultingId(
    consultingId: number,
    userId: number,
  ): Promise<IReportToSend | null> {
    try {
      const consulting = await this.consultingRepo.findOne({
        where: { id: consultingId },
        relations: ["user", "report", "report.keyRecommendations"],
      });

      if (!consulting) {
        return null;
      }

      if (consulting.user.id !== userId) {
        throw new Error(
          "Access denied: You do not own this consulting session",
        );
      }

      if (!consulting.report) {
        return null;
      }

      const report = consulting.report;

      // Map entity records to the interface shape
      const keyRecommendations: IKeyRecommendation[] = (
        report.keyRecommendations ?? []
      ).map((rec) => ({
        id: rec.id,
        title: rec.title,
        description: rec.description,
        labels: rec.labels,
        reportId: rec.reportId,
      }));

      return {
        reportId: report.id,
        summary: report.summary,
        proposal: report.proposal,
        conclusion: report.conclusion,
        keyRecommendations,
        estimatedImpact: report.estimatedImpact || {
          timeframe: "medio_plazo",
          complexity: "media",
          investmentLevel: "moderado",
        },
        createdAt: report.createdAt,
      };
    } catch (error) {
      console.error("Error retrieving report:", error);
      throw error;
    }
  }

  /**
   * Generates a PDF report for a completed consulting session.
   * Creates a complete PDF document and returns it as Base64 encoded string.
   *
   * @param consultingId - The ID of the consulting session
   * @param userId - The authenticated user's ID (for validation)
   * @returns Base64 encoded PDF and metadata for download
   * @throws {Error} If consulting not found, access denied, not finished, or report missing
   */
  public static async generateReportDoc(
    consultingId: number,
    userId: number,
  ): Promise<IPdfReportData> {
    try {
      // Fetch consulting with all related data
      const consulting = await this.consultingRepo.findOne({
        where: { id: consultingId },
        relations: [
          "user",
          "user.company",
          "report",
          "report.keyRecommendations",
          "areas",
        ],
      });

      // Validate consulting exists
      if (!consulting) {
        throw new Error(`Consulting with ID ${consultingId} not found`);
      }

      // Validate user ownership
      if (consulting.user.id !== userId) {
        throw new Error(
          "Access denied: This consulting session does not belong to you",
        );
      }

      // Validate consulting is finished
      if (consulting.statusCons !== ConsultingStatus.FINISHED) {
        throw new Error(
          "Cannot generate PDF: Consulting session is not yet finished",
        );
      }

      // Validate report exists
      if (!consulting.report) {
        throw new Error(
          "Report not found: Please generate the report first before creating PDF",
        );
      }

      // Generate PDF
      const pdf = this.buildPdfDocument(consulting);

      // Convert PDF to Base64
      const pdfString = pdf.output();
      const pdfBase64 = Buffer.from(pdfString, "binary").toString("base64");

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `informe-consultoria-${consultingId}-${timestamp}.pdf`;

      return {
        pdfBase64,
        fileName,
        metadata: {
          title: `Informe de Consultoría - ${consulting.title}`,
          generatedAt: new Date(),
          reportId: consulting.report.id,
          consultingId: consulting.id,
        },
      };
    } catch (error) {
      console.error("Error generating PDF report:", error);
      throw error;
    }
  }

  /**
   * Builds a complete PDF document with all consulting report information.
   *
   * @param consulting - The consulting entity with all relations loaded
   * @returns jsPDF instance with formatted report content
   */
  private static buildPdfDocument(consulting: Consulting): jsPDF {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;

      // Helper to create RGB color tuples
      const rgb = (r: number, g: number, b: number): [number, number, number] => [r, g, b];

    // Color palette
    const colors = {
      primary: rgb(41, 128, 185),      // Professional blue
      secondary: rgb(52, 73, 94),      // Dark blue-gray
      accent: rgb(46, 204, 113),       // Green accent
      lightGray: rgb(236, 240, 241),   // Light gray background
      darkGray: rgb(127, 140, 141),    // Medium gray
      white: rgb(255, 255, 255),       // White
      warning: rgb(241, 196, 15),      // Yellow/gold
    };

    // Helper function to check if we need a new page
    const checkPageBreak = (currentY: number, requiredSpace: number): number => {
      // If we have less than 35mm available, or if adding this content would exceed the page,
      // start fresh on a new page to avoid awkward splits
      const availableSpace = pageHeight - margin - currentY;
      
      if (availableSpace < 35 || currentY + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        this.addPageHeader(pdf, pageWidth, colors);
        return 27; // Ajustado para compensar el spacing de los section headers
      }
      return currentY;
    };

    // Helper function to draw section header with background
    const drawSectionHeader = (title: string, yPos: number): number => {
      // Add spacing before the header to avoid overlap
      const adjustedY = yPos + 8;
      
      // Draw colored background rectangle
      pdf.setFillColor(...colors.primary);
      pdf.rect(margin - 5, adjustedY - 7, contentWidth + 10, 11, "F");
      
      // Draw section title
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, margin, adjustedY);
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      
      return adjustedY + 12;
    };

    // Helper function to draw info box
    const drawInfoBox = (content: string[], yPos: number, bgColor: [number, number, number] = colors.lightGray): number => {
      const boxPadding = 10;
      const lineHeight = 7;
      const boxHeight = content.length * lineHeight + boxPadding;
      
      // Draw background box
      pdf.setFillColor(...bgColor);
      pdf.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, "F");
      
      // Draw border
      pdf.setDrawColor(...colors.primary);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, "S");
      
      // Draw content
      pdf.setTextColor(...colors.secondary);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      let currentY = yPos + boxPadding / 2 + 5;
      content.forEach(line => {
        pdf.text(line, margin + 5, currentY);
        currentY += lineHeight;
      });
      
      // Reset
      pdf.setTextColor(0, 0, 0);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
      
      return yPos + boxHeight + 5;
    };

    // Helper function to add styled paragraph
    const addStyledParagraph = (text: string, yPos: number, maxY: number): number => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      
      const lines = pdf.splitTextToSize(text, contentWidth);
      let currentY = yPos;
      
      for (const line of lines) {
        if (currentY > maxY) {
          pdf.addPage();
          this.addPageHeader(pdf, pageWidth, colors);
          currentY = 27; // Ajustado para compensar el spacing de los section headers
        }
        pdf.text(line, margin, currentY);
        currentY += 6;
      }
      
      pdf.setTextColor(0, 0, 0);
      return currentY + 3;
    };

    // ============ COVER PAGE ============
    this.buildCoverPage(pdf, consulting, colors, pageWidth, pageHeight);
    
    // ============ CONTENT PAGES ============
    pdf.addPage();
    this.addPageHeader(pdf, pageWidth, colors);
    let yPosition = 27; // Ajustado para compensar el spacing de los section headers

    // Conclusion Section (Executive Summary) - Página dedicada
    if (consulting.report?.conclusion) {
      yPosition = drawSectionHeader("Conclusión Ejecutiva", yPosition);
      yPosition = addStyledParagraph(consulting.report.conclusion, yPosition, pageHeight - margin);
    }

    // Summary Section - Nueva página
    pdf.addPage();
    this.addPageHeader(pdf, pageWidth, colors);
    yPosition = 27;
    
    yPosition = drawSectionHeader("Resumen del Problema Planteado", yPosition);
    if (consulting.report?.summary) {
      yPosition = addStyledParagraph(consulting.report.summary, yPosition, pageHeight - margin);
    }

    // Proposal Section - Misma página que el resumen
    yPosition = checkPageBreak(yPosition, 30);
    
    yPosition = drawSectionHeader("Recomendaciones y Propuesta", yPosition);
    if (consulting.report?.proposal) {
      yPosition = addStyledParagraph(consulting.report.proposal, yPosition, pageHeight - margin);
    }

    // Key Recommendations Section - Nueva página
    const keyRecs = consulting.report?.keyRecommendations;
    if (keyRecs && keyRecs.length > 0) {
      // Nueva página para las recomendaciones clave
      pdf.addPage();
      this.addPageHeader(pdf, pageWidth, colors);
      yPosition = 27;

      yPosition = drawSectionHeader("Recomendaciones Clave", yPosition);

      keyRecs.forEach((rec, index) => {
        // Check if there's enough space for title + 2 lines of description
        yPosition = checkPageBreak(yPosition, 25);

        // Title sin box, como subsección con numeración
        pdf.setTextColor(...colors.secondary);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        const numberedTitle = `${index + 1}. ${rec.title}`;
        const titleLines = pdf.splitTextToSize(numberedTitle, contentWidth - 10);
        let titleY = yPosition;
        titleLines.forEach((line: string) => {
          if (titleY > pageHeight - margin) {
            pdf.addPage();
            this.addPageHeader(pdf, pageWidth, colors);
            titleY = 35;
          }
          pdf.text(line, margin, titleY);
          titleY += 6;
        });
        yPosition = titleY + 4;

        // Description
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        const descLines = pdf.splitTextToSize(rec.description, contentWidth - 10);
        descLines.forEach((line: string) => {
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            this.addPageHeader(pdf, pageWidth, colors);
            yPosition = 35;
          }
          pdf.text(line, margin, yPosition);
          yPosition += 5.5;
        });

        // Labels/Tags
        if (rec.labels && rec.labels.length > 0) {
          // Colores para las tags
          const tagColors = [
            { bg: rgb(240, 248, 255), text: rgb(41, 128, 185), border: rgb(41, 128, 185) },      // Azul
            { bg: rgb(240, 255, 240), text: rgb(46, 204, 113), border: rgb(46, 204, 113) },      // Verde
            { bg: rgb(255, 250, 240), text: rgb(241, 196, 15), border: rgb(241, 196, 15) },      // Amarillo
            { bg: rgb(255, 240, 245), text: rgb(231, 76, 60), border: rgb(231, 76, 60) },        // Rojo
            { bg: rgb(245, 240, 255), text: rgb(155, 89, 182), border: rgb(155, 89, 182) },      // Morado
            { bg: rgb(240, 255, 255), text: rgb(26, 188, 156), border: rgb(26, 188, 156) },      // Turquesa
          ];
          
          yPosition += 4;
          let xPos = margin;
          rec.labels.forEach((label: string, labelIndex: number) => {
            const tagColor = tagColors[labelIndex % tagColors.length];
            const trimmedLabel = label.trim();
            pdf.setFillColor(...tagColor.bg);
            pdf.setDrawColor(...tagColor.border);
            pdf.setLineWidth(0.5);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8);
            const labelWidth = pdf.getTextWidth(trimmedLabel) + 6;
            pdf.roundedRect(xPos, yPosition - 3, labelWidth, 5, 1, 1, "FD");
            pdf.setTextColor(...tagColor.text);
            pdf.text(trimmedLabel, xPos + 3, yPosition);
            xPos += labelWidth + 3;
            if (xPos > pageWidth - margin - 20) {
              xPos = margin;
              yPosition += 7;
            }
          });
          pdf.setLineWidth(0.2);
          pdf.setFont("helvetica", "normal");
          yPosition += 6;
        }
        
        yPosition += 6;
        pdf.setTextColor(0, 0, 0);
      });
    }

    // Area-specific Proposals Section
    const areas = consulting.areas ?? [];
    if (areas.length > 0) {
      // Nueva página para las propuestas específicas por área
      pdf.addPage();
      this.addPageHeader(pdf, pageWidth, colors);
      yPosition = 27;

      yPosition = drawSectionHeader("Propuestas Específicas por Área", yPosition);

      // Array de colores para diferentes áreas
      const areaColors = [
        { bg: rgb(240, 248, 255), border: rgb(41, 128, 185), badge: rgb(41, 128, 185) },    // Azul
        { bg: rgb(240, 255, 240), border: rgb(46, 204, 113), badge: rgb(46, 204, 113) },    // Verde
        { bg: rgb(255, 250, 240), border: rgb(241, 196, 15), badge: rgb(241, 196, 15) },    // Amarillo
        { bg: rgb(255, 240, 245), border: rgb(231, 76, 60), badge: rgb(231, 76, 60) },      // Rojo
        { bg: rgb(245, 240, 255), border: rgb(155, 89, 182), badge: rgb(155, 89, 182) },    // Morado
        { bg: rgb(240, 255, 255), border: rgb(26, 188, 156), badge: rgb(26, 188, 156) },    // Turquesa
      ];

      areas.forEach((area, index) => {
        // Check if there's enough space for area box (minimum 40mm)
        yPosition = checkPageBreak(yPosition, 40);

        const areaColor = areaColors[index % areaColors.length];
        const boxStartY = yPosition;
        const boxPadding = 8;
        const boxMargin = margin - 2;
        const boxWidth = contentWidth + 4;
        
        // Pre-calcular las líneas del contenido
        let summaryLines: string[] = [];
        if (area.summary) {
          summaryLines = pdf.splitTextToSize(area.summary, boxWidth - 8);
        }
        
        let proposalLines: string[] = [];
        if (area.proposal) {
          proposalLines = pdf.splitTextToSize(area.proposal, boxWidth - 8);
        }
        
        // Calcular altura exacta del contenido simulando el renderizado
        let boxY = boxStartY + boxPadding;
        boxY += 10; // Area name
        
        if (area.summary) {
          boxY += summaryLines.length * 5.5;
          if (area.proposal) {
            boxY += 3; // Espacio entre summary y proposal
          }
        }
        
        if (area.proposal) {
          boxY += 10; // Label "Propuesta Comercial"
          boxY += proposalLines.length * 5.5;
        }
        
        // Calcular altura total del box con padding final
        const contentHeight = boxY - boxStartY + boxPadding;
        
        // Dibujar el box de fondo con color específico del área
        pdf.setFillColor(...areaColor.bg);
        pdf.roundedRect(boxMargin, boxStartY, boxWidth, contentHeight, 3, 3, "F");
        
        // Dibujar borde del box
        pdf.setDrawColor(...areaColor.border);
        pdf.setLineWidth(1);
        pdf.roundedRect(boxMargin, boxStartY, boxWidth, contentHeight, 3, 3, "S");
        
        // Resetear line width
        pdf.setLineWidth(0.2);
        
        // Ahora renderizar el contenido real
        boxY = boxStartY + boxPadding;

        // Area name sin badge (sin numeración)
        pdf.setTextColor(...colors.secondary);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(area.name, margin + 4, boxY + 2);
        boxY += 10;

        // Area summary (sin título)
        if (area.summary) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(60, 60, 60);
          summaryLines.forEach((line: string) => {
            pdf.text(line, margin + 4, boxY);
            boxY += 5.5;
          });
          if (area.proposal) {
            boxY += 3; // Espacio entre summary y proposal
          }
        }

        // Area proposal (Propuesta Comercial)
        if (area.proposal) {
          // Draw subsection label with semi-transparent background
          pdf.setFillColor(255, 255, 255, 0.7);
          pdf.roundedRect(margin + 2, boxY - 1, boxWidth - 12, 7, 1, 1, "F");
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.setDrawColor(...areaColor.border);
          pdf.setTextColor(...areaColor.border);
          pdf.text("Propuesta Comercial", margin + 4, boxY + 3);
          boxY += 10;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(60, 60, 60);
          proposalLines.forEach((line: string) => {
            pdf.text(line, margin + 4, boxY);
            boxY += 5.5;
          });
        }
        
        // Actualizar yPosition después del box
        yPosition = boxStartY + contentHeight + 10;
        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);
      });
    }

    // Estimated Impact Section - Diseño en tres bloques
    if (consulting.report!.estimatedImpact) {
      // Check space for header + three blocks (estimate ~50mm total)
      yPosition = checkPageBreak(yPosition, 50);

      yPosition = drawSectionHeader("Impacto Estimado", yPosition);

      const impact = consulting.report!.estimatedImpact;
      const blockWidth = (contentWidth - 10) / 3; // Dividir en 3 con espacios
      const blockHeight = 35;
      const startY = yPosition;
      
      // Helper para formatear texto: mayúsculas, sin guiones bajos
      const formatImpactText = (text: string): string => {
        return text.replace(/_/g, ' ').toUpperCase();
      };
      
      // Bloque izquierda - Plazo
      if (impact.timeframe) {
        const leftX = margin;
        pdf.setFillColor(240, 248, 255); // Azul suave
        pdf.roundedRect(leftX, startY, blockWidth, blockHeight, 3, 3, "F");
        pdf.setDrawColor(...colors.primary);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(leftX, startY, blockWidth, blockHeight, 3, 3, "S");
        
        // Etiqueta
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("PLAZO", leftX + blockWidth / 2, startY + 10, { align: "center" });
        
        // Valor formateado
        pdf.setTextColor(...colors.secondary);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        const formattedTimeframe = formatImpactText(impact.timeframe.replace(/_plazo|plazo/gi, '').trim());
        const timeframeLines = pdf.splitTextToSize(formattedTimeframe, blockWidth - 8);
        let timeY = startY + 20;
        timeframeLines.forEach((line: string) => {
          pdf.text(line, leftX + blockWidth / 2, timeY, { align: "center" });
          timeY += 6;
        });
      }
      
      // Bloque centro - Complejidad
      if (impact.complexity) {
        const centerX = margin + blockWidth + 5;
        pdf.setFillColor(255, 250, 240); // Amarillo suave
        pdf.roundedRect(centerX, startY, blockWidth, blockHeight, 3, 3, "F");
        pdf.setDrawColor(...colors.warning);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(centerX, startY, blockWidth, blockHeight, 3, 3, "S");
        
        // Etiqueta
        pdf.setTextColor(...colors.warning);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("COMPLEJIDAD", centerX + blockWidth / 2, startY + 10, { align: "center" });
        
        // Valor formateado
        pdf.setTextColor(...colors.secondary);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        const formattedComplexity = formatImpactText(impact.complexity);
        const complexityLines = pdf.splitTextToSize(formattedComplexity, blockWidth - 8);
        let complexY = startY + 20;
        complexityLines.forEach((line: string) => {
          pdf.text(line, centerX + blockWidth / 2, complexY, { align: "center" });
          complexY += 6;
        });
      }
      
      // Bloque derecha - Nivel de Inversión
      if (impact.investmentLevel) {
        const rightX = margin + (blockWidth + 5) * 2;
        pdf.setFillColor(240, 255, 240); // Verde suave
        pdf.roundedRect(rightX, startY, blockWidth, blockHeight, 3, 3, "F");
        pdf.setDrawColor(...colors.accent);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(rightX, startY, blockWidth, blockHeight, 3, 3, "S");
        
        // Etiqueta
        pdf.setTextColor(...colors.accent);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("INVERSIÓN", rightX + blockWidth / 2, startY + 10, { align: "center" });
        
        // Valor formateado
        pdf.setTextColor(...colors.secondary);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        const formattedInvestment = formatImpactText(impact.investmentLevel);
        const investmentLines = pdf.splitTextToSize(formattedInvestment, blockWidth - 8);
        let investY = startY + 20;
        investmentLines.forEach((line: string) => {
          pdf.text(line, rightX + blockWidth / 2, investY, { align: "center" });
          investY += 6;
        });
      }
      
      yPosition = startY + blockHeight + 8;
      pdf.setTextColor(0, 0, 0);
    }

    // Add footers to all pages
    this.addPageFooters(pdf, pageWidth, pageHeight, margin, colors);

    return pdf;
    
    } catch (error) {
      console.error('[PDF Generation] Error building PDF document:', error);
      if (error instanceof Error) {
        console.error('[PDF Generation] Error stack:', error.stack);
      }
      throw new Error(`Failed to build PDF document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Builds the cover page of the PDF report
   */
  private static buildCoverPage(
    pdf: jsPDF,
    consulting: Consulting,
    colors: ColorPalette,
    pageWidth: number,
    pageHeight: number,
  ): void {
    // Add company logo
    try {
      const logoPath = path.join(__dirname, '../assets/tedconsulting logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = logoBuffer.toString('base64');
      const logoDataUrl = `data:image/png;base64,${logoBase64}`;
      
      // Add logo at the top center (40mm wide, maintaining aspect ratio)
      const logoWidth = 70;
      const logoHeight = 20; // Ajusta según el aspect ratio de tu logo
      const logoX = (pageWidth - logoWidth) / 2;
      const logoY = 15;
      
      pdf.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      console.warn('[PDF Generation] Could not load logo:', error);
    }

    // Header delgado con azul claro
    pdf.setFillColor(52, 152, 219);
    pdf.rect(0, 40, pageWidth, 30, "F");

    // Main title - ajustado posición
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(38);
    pdf.setFont("helvetica", "bold");
    pdf.text("Informe de Consultoría", pageWidth / 2, 60, { align: "center" });

    // Project title box - reducido a 55mm
    pdf.setFillColor(...colors.white);
    pdf.roundedRect(20, 78, pageWidth - 40, 55, 3, 3, "F");
    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(20, 78, pageWidth - 40, 55, 3, 3, "S");

    pdf.setTextColor(...colors.secondary);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("PROYECTO", pageWidth / 2, 93, { align: "center" });

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...colors.primary);
    const titleLines = pdf.splitTextToSize(consulting.title, pageWidth - 60);
    let titleY = 108;
    titleLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, titleY, { align: "center" });
      titleY += 8;
    });

    // Company and client info box - ampliado a 80mm para mejor legibilidad
    if (consulting.user.company) {
      pdf.setFillColor(248, 249, 250);
      pdf.roundedRect(20, 138, pageWidth - 40, 80, 3, 3, "F");
      pdf.setDrawColor(...colors.primary);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(20, 138, pageWidth - 40, 80, 3, 3, "S");
      
      // Título principal
      pdf.setTextColor(...colors.darkGray);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("DATOS DE EMPRESA", pageWidth / 2, 150, { align: "center" });
      
      let dataY = 163;
      
      // Nombre - etiqueta arriba del valor
      pdf.setTextColor(...colors.primary);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("NOMBRE", pageWidth / 2, dataY, { align: "center" });
      
      pdf.setTextColor(...colors.secondary);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(consulting.user.company.name, pageWidth / 2, dataY + 6, { align: "center" });
      
      dataY += 21;
      
      // Sector - etiqueta arriba del valor
      pdf.setTextColor(...colors.primary);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("SECTOR", pageWidth / 2, dataY, { align: "center" });
      
      pdf.setTextColor(...colors.secondary);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      const sectorText = consulting.user.company.sector.toUpperCase();
      pdf.text(sectorText, pageWidth / 2, dataY + 6, { align: "center" });
      
      dataY += 21;
      
      // Tamaño - etiqueta arriba del valor
      pdf.setTextColor(...colors.primary);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("TAMAÑO", pageWidth / 2, dataY, { align: "center" });
      
      pdf.setTextColor(...colors.secondary);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(consulting.user.company.size, pageWidth / 2, dataY + 6, { align: "center" });
    }

    // Date and client box at bottom - subido para mejor balance visual
    pdf.setFillColor(...colors.lightGray);
    pdf.roundedRect(20, pageHeight - 65, pageWidth - 40, 35, 3, 3, "F");

    // Columna izquierda - Cliente (con más margen interno)
    const clientBoxLeftMargin = 35;
    const clientBoxRightMargin = 65;
    
    pdf.setTextColor(...colors.darkGray);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("PREPARADO PARA", clientBoxLeftMargin, pageHeight - 55);
    
    pdf.setTextColor(...colors.secondary);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(
      `${consulting.user.name} ${consulting.user.lastName}`,
      clientBoxLeftMargin,
      pageHeight - 45
    );

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...colors.darkGray);
    pdf.text(consulting.user.mail, clientBoxLeftMargin, pageHeight - 36);

    // Columna derecha - Fecha (con más margen interno)
    pdf.setFontSize(9);
    pdf.text("FECHA", pageWidth - clientBoxRightMargin, pageHeight - 55);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...colors.secondary);
    pdf.text(
      new Date(consulting.report!.createdAt).toLocaleDateString("es-ES", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      pageWidth - clientBoxRightMargin,
      pageHeight - 45
    );
  }

  /**
   * Adds a header to content pages
   */
  private static addPageHeader(pdf: jsPDF, pageWidth: number, colors: ColorPalette): void {
    pdf.setFillColor(...colors.primary);
    pdf.rect(0, 0, pageWidth, 18, "F");
    
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Informe de Consultoría", 10, 11);
  }

  /**
   * Adds footers to all pages
   */
  private static addPageFooters(
    pdf: jsPDF,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    colors: ColorPalette,
  ): void {
    const totalPages = pdf.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      
      // Skip footer on cover page  
      if (i === 1) continue;

      // Footer line
      pdf.setDrawColor(...colors.lightGray);
      pdf.setLineWidth(0.5);
      pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      // Page number
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...colors.darkGray);
      pdf.text(
        `Página ${i - 1} de ${totalPages - 1}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      
      // Generation date
      pdf.text(
        `Generado el ${new Date().toLocaleDateString("es-ES")}`,
        margin,
        pageHeight - 10
      );
    }
  }
}
