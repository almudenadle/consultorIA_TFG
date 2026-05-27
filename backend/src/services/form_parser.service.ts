import { DB } from "../config/typeorm";
import { Consulting } from "../entities/consulting.entity";
import { ConsultingKpiArea } from "../entities/consulting_kpi_area.entity";
import { Form } from "../entities/form.entity";
import { User } from "../entities/user.entity";

import {
  IFormToRecieve,
  IFormToSend,
} from "../models/interfaces/form_data.interface";
import { StatusArea } from "../models/enums/kpi_status.enum";

import fs from "fs";
import path from "path";

/**
 * Handles conversion between form data structures and AI prompt formats.
 * Manages question counters and form persistence operations.
 */
export class FormParser {
  private static readonly consultingRepo = DB.getRepository(Consulting);
  private static readonly consultingKpiAreaRepo =
    DB.getRepository(ConsultingKpiArea);
  private static readonly formRepo = DB.getRepository(Form);
  private static readonly userRepo = DB.getRepository(User);

  /**
   * Transforms user responses into a structured prompt for AI processing.
   * Handles form saving for both initial and follow-up forms.
   *
   * @param data - Form data with user responses and identifiers
   * @returns Formatted prompt string for OpenAI Assistant
   * @throws {Error} If consulting not found
   */
  public static async parseQuestionsToPrompt(
    data: IFormToRecieve,
    userId: number,
  ): Promise<string> {
    const consulting = await this.consultingRepo.findOne({
      where: { id: data.consultingID },
      select: ["id", "numQuestions"],
      relations: ["areas"],
    });

    if (!consulting)
      throw new Error(
        "Consulting ID does not match any consulting on database",
      );

    let numQuestions: number = consulting.numQuestions;
    const isFirstForm = consulting.numQuestions === 0;

    let prompt: string = "";

    if (isFirstForm) {
      prompt += await this.generateInitialPrompt(data.responses || [], userId);
      // Save initial form as completed
      await this.saveFormWithResponses(data, true);
    } else {
      prompt += this.generateProgressPrompt(consulting.areas);
      // Update existing form with responses
      await this.saveFormWithResponses(data, false);
    }

    data.responses?.forEach((field) => {
      let formattedResponse = field.response;

      // Detectar y formatear respuestas multiselect (arrays JSON)
      try {
        const parsed = JSON.parse(field.response);
        if (Array.isArray(parsed)) {
          formattedResponse =
            parsed.length > 0
              ? parsed.join(", ")
              : "[No se seleccionó ninguna opción]";
        }
      } catch {
        // No es JSON válido, usar el string original (select/textarea normales)
      }

      prompt += `**Pregunta ${numQuestions + 1} con ID =** ${
        field.idField
      }.\n**Respuesta a la pregunta:** ${formattedResponse}\n`;
      numQuestions += 1;
    });

    return prompt;
  }

  /**
   * Updates consulting numQuestions and meanVelocity, and creates the next form.
   *
   * @param data - Form structure with AI-generated questions
   * @param numQuestionsAns - Total number of questions answered so far
   * @param newMeanVelocity - Updated mean velocity value to persist
   * @param newMeanVelocity - Updated mean velocity value to persist
   * @returns Form data with assigned database identifier
   * @throws {Error} If consulting not found or database operation fails
   */
  public static async parseAgentResponseToForm(
    data: IFormToSend,
    numQuestionsAns: number,
    newMeanVelocity: number,
  ): Promise<IFormToSend> {
    const consulting = await this.consultingRepo.findOne({
      where: { id: data.consultingID },
      relations: ["areas"],
    });
    if (!consulting) throw new Error("Consulting not found");

    // Console log para debugging
    console.log("\n" + "=".repeat(80));
    console.log("ACTUALIZACION DE AREAS");
    console.log("=".repeat(80));
    console.log(`Consulting ID: ${data.consultingID}`);
    console.log(`Total Preguntas Respondidas: ${numQuestionsAns}`);
    console.log(`Velocidad Media: ${newMeanVelocity.toFixed(2)}`);
    console.log("\nAREAS DETECTADAS:");
    console.log("-".repeat(80));

    consulting.areas.forEach((area: any, index: number) => {
      const statusLabel =
        area.status === StatusArea.COMPLETED
          ? "COMPLETED"
          : area.status === StatusArea.IN_PROGRESS
            ? "IN_PROGRESS"
            : "PENDING";

      const scoreChange = area.actualScore - area.previousScore;
      const changeIndicator =
        scoreChange > 0 ? "UP" : scoreChange < 0 ? "DOWN" : "STABLE";

      console.log(
        `\n${index + 1}. [${statusLabel}] ${area.name} (${area.areaId})`,
      );
      console.log(
        `   Score: ${area.previousScore} -> ${area.actualScore}/10 [${changeIndicator}] (${scoreChange >= 0 ? "+" : ""}${scoreChange.toFixed(1)})`,
      );
      console.log(`   Preguntas: ${area.numQuestions}`);
      if (area.summary) {
        console.log(
          `   Resumen: ${area.summary.substring(0, 100)}${area.summary.length > 100 ? "..." : ""}`,
        );
      }
    });
    console.log("=".repeat(80) + "\n");

    // Persist numQuestions and meanVelocity at consulting level
    await this.consultingRepo.update(
      { id: data.consultingID },
      {
        numQuestions: numQuestionsAns,
        meanVelocity: newMeanVelocity,
        lastAssistantMessage: data.assistantMessage || undefined,
      },
    );

    // Get the current area in progress to assign to the new form
    const currentArea = consulting.areas.find(
      (area:any) => area.status === StatusArea.IN_PROGRESS,
    );

    const newForm = this.formRepo.create({
      areaName: currentArea?.name || "Sin área asignada",
      isComplete: false,
      fields: data.questions || [],
      consulting: consulting,
    });

    const res = await this.formRepo.save(newForm);
    data.formID = res.id;

    // Ensure meanVelocity is set in the returned data
    data.meanVelocity = newMeanVelocity;

    return data;
  }

  /**
   * Builds the initial phase prompt from diagnostic form responses.
   *
   * @param responses - User responses from initial diagnostic form
   * @returns Formatted initialization prompt
   */
  private static async generateInitialPrompt(
    responses: any[],
    userId: number,
  ): Promise<string> {
    const context = await this.generateInitialContext(userId);
    return `
      ${context}

      *** ACTIVAR [FASE: INICIALIZACIÓN] ***

    `;
  }

  /**
   * Constructs follow-up phase prompt with area status context.
   *
   * @param areas - Current ConsultingKpiArea entities with scores and statuses
   * @returns Formatted progress tracking prompt
   */
  private static generateProgressPrompt(areas: ConsultingKpiArea[]): string {
    const currentArea =
      areas?.find((a) => a.status === StatusArea.IN_PROGRESS) ||
      areas?.find((a) => a.status === StatusArea.PENDING);

    if (!currentArea) return "Error: No data.";

    let areasContextList = "";
    areas.forEach((area) => {
      const statusStr =
        area.status === StatusArea.COMPLETED
          ? "COMPLETADO"
          : area.status === StatusArea.IN_PROGRESS
            ? "EN PROGRESO (ACTUAL)"
            : "PENDIENTE";

      const attentionFlag =
        area.actualScore < 8 ? " <-- [NEEDS ATTENTION]" : " [OK]";

      areasContextList +=
        `- ID: "${area.areaId}" | Nombre: "${area.name}" | Score: ${area.actualScore}/10` +
        ` | Estado: ${statusStr}${attentionFlag}\n`;
    });

    return `
      *** ACTIVAR [FASE: SEGUIMIENTO] ***
      
      CONTEXTO GLOBAL DE ÁREAS (Tablero de control):
      ${areasContextList}

      --------------------------------------------------
      FOCO DE ANÁLISIS ACTUAL (Respuestas recibidas):
      Estás analizando las respuestas del usuario sobre el área: **"${currentArea.name}"** (ID: ${currentArea.areaId}).
      - Score Previo: ${currentArea.actualScore} / 10
      - Resumen Previo: "${currentArea.summary || ""}"
      
      DEBES seleccionar SIEMPRE un área de la lista superior que tenga [NEEDS ATTENTION] (Score < 8).
    `;
  }

  private static async generateInitialContext(userID: number): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { id: userID },
      relations: ["company"],
    });

    if (!user || !user.company) {
      return "INFORMACIÓN DE LA EMPRESA: No disponible";
    }

    const { name, size, sector } = user.company;
    return `La empresa que plantea el problema tiene las siguientes características:
- Nombre: "${name}"
- Tamaño: "${size}"
- Sector: "${sector}"`;
  }

  /**
   * Handles form saving for both initial and follow-up forms.
   * For initial forms: loads template and creates new form.
   * For follow-up forms: updates existing form with responses.
   *
   * @param data - Form data with responses and identifiers
   * @param isInitial - Whether this is the initial diagnostic form
   * @throws {Error} If form not found or template cannot be loaded
   */
  private static async saveFormWithResponses(
    data: IFormToRecieve,
    isInitial: boolean,
  ): Promise<void> {
    if (isInitial) {
      // Load initial form structure
      const initialFormPath = path.join(
        __dirname,
        "../models/initial_form.json",
      );
      const initialFormDataRaw = fs.readFileSync(initialFormPath, "utf-8");
      const initialFormData = JSON.parse(initialFormDataRaw);

      // Map fields with responses
      const completedFields = initialFormData.questions.map((field: any) => {
        const userResponse = data.responses?.find(
          (resp) => resp.idField === field.idField,
        );

        if (userResponse) {
          return {
            ...field,
            response: userResponse.response,
            isAnswered: true,
          };
        }

        return field;
      });

      // Save initial form as completed
      const consulting = await this.consultingRepo.findOne({
        where: { id: data.consultingID },
      });

      if (!consulting) throw new Error("Consulting not found");

      const initialForm = this.formRepo.create({
        areaName: "Diagnóstico Inicial",
        isComplete: true,
        fields: completedFields,
        consulting: consulting,
      });

      const savedForm = await this.formRepo.save(initialForm);
      data.formID = savedForm.id;
    } else {
      // Update existing form with responses
      const form = await this.formRepo.findOne({
        where: { id: data.formID },
      });

      if (!form) {
        throw new Error("Form not found");
      }

      const updatedFields = form.fields.map((field: any) => {
        const userResponse = data.responses?.find(
          (resp) => resp.idField === field.idField,
        );

        if (userResponse) {
          return {
            ...field,
            response: userResponse.response,
            isAnswered: true,
          };
        }

        return field;
      });

      // Update form as complete
      await this.formRepo.update(
        { id: data.formID },
        {
          isComplete: true,
          fields: updatedFields,
        },
      );
    }
  }
}
