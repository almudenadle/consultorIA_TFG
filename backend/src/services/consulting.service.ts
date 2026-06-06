import { DB } from "../config/typeorm";
import { Consulting } from "../entities/consulting.entity";
import { ConsultingKpiArea } from "../entities/consulting_kpi_area.entity";
import { User } from "../entities/user.entity";
import { FormParser } from "./form_parser.service";
import { GroqClient } from "./groq.client";
import fs from "fs";
import path from "path";
import {
  IFormToRecieve,
  IFormToSend,
  IConsultingListItem,
} from "../models/interfaces/form_data.interface";
import { IFormFieldToSend } from "../models/interfaces/form_field.interface";
import {
  getResponseFormat,
  InitResponseSchema,
  FollowUpResponseSchema,
  InitResponse,
  FollowUpResponse,
} from "../models/schemas/groq_schemas";
import { ResponseType } from "../models/enums/response_type.enum";
import { StatusArea } from "../models/enums/kpi_status.enum";

/**
 * Service managing AI-powered consulting sessions using Groq chat completions.
 * Handles consulting creation, prompt generation, structured response parsing, and KPI updates.
 */
export class ConsultingService {
  private static readonly MAX_NUM_QUESTIONS = 30;
  private static readonly MAX_NUM_QUESTIONS_PER_FORM = 4;
  private static readonly MIN_SCORE = 8;
  private static readonly AREA_FINISHED = "FINISHED";
  private static readonly DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
  private static readonly DEFAULT_MAX_COMPLETION_TOKENS = 4096;
  private static readonly GROQ_ASSISTANT_INSTRUCTIONS = fs.readFileSync(
    path.join(__dirname, "../models/schemas/groq_assistant_instructions.txt"),
    "utf-8",
  );

  private static readonly consultingRepo = DB.getRepository(Consulting);
  private static readonly consultingKpiAreaRepo =
    DB.getRepository(ConsultingKpiArea);
  private static readonly userRepo = DB.getRepository(User);

  /**
   * Processes user form responses and retrieves next questions from Groq.
   * Manages conversation flow and validates responses using Zod schemas.
   * If consultingID is -1, creates a new consulting session before processing.
   */
  public static async sendMessage(
    data: IFormToRecieve,
    userId: number,
  ): Promise<IFormToSend> {
    if (!data) throw Error("Invalid form data.");

    const groq = GroqClient.getInstance();


    // Create consulting session if this is the first submission
    if (!data.consultingID || data.consultingID === -1) {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: ["id", "userId"],
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const newConsulting = this.consultingRepo.create({
        title: data.title!,
        user: user,
      });

      const savedConsulting = await this.consultingRepo.save(newConsulting);
      data.consultingID = savedConsulting.id;
    }

    let consultingRecord = await this.consultingRepo.findOne({
      where: { id: data.consultingID },
      relations: ["user", "areas"],
    });

    if (!consultingRecord)
      throw new Error(`Consulting ${data.consultingID} not found`);
    if (consultingRecord.user.id !== userId) throw new Error("Access denied");

    const isFirstForm = consultingRecord.numQuestions === 0;
    const responseType = isFirstForm
      ? ResponseType.INIT
      : ResponseType.FOLLOW_UP;

    const numQuestionsAns =
      consultingRecord.numQuestions + data.responses!.length;

    let promptToAgent = await FormParser.parseQuestionsToPrompt(data, userId);

    if (
      numQuestionsAns + this.MAX_NUM_QUESTIONS_PER_FORM >
      this.MAX_NUM_QUESTIONS
    ) {
      promptToAgent += `IMPORTANTE: En este formulario debes de generar ${
        this.MAX_NUM_QUESTIONS - numQuestionsAns + 1
      } preguntas nuevas. Tienes prohibido generar más o generar menos`;
    }

    try {
      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || this.DEFAULT_GROQ_MODEL,
        max_completion_tokens:
          Number(process.env.GROQ_MAX_COMPLETION_TOKENS) ||
          this.DEFAULT_MAX_COMPLETION_TOKENS,
        messages: [
          {
            role: "user",
            content: this.buildPromptWithInstructions(promptToAgent),
          },
        ],
        response_format: getResponseFormat(responseType),
      });

      if (completion.choices[0]?.finish_reason === "length") {
        const tokenLimitResponse = this.buildTokenLimitResponse(responseType);

        let questionsToSend: IFormFieldToSend[] = [];
        let updatedAreas: ConsultingKpiArea[] = [];
        let newMeanVelocity: number = consultingRecord.meanVelocity ?? 0;
        let assistantMessage: string = tokenLimitResponse.assistantMessage;

        if (isFirstForm) {
          const validated = InitResponseSchema.parse(tokenLimitResponse);
          questionsToSend = this.mapQuestions(validated.questions);
          const result = await this.handleInitKpis(validated, data.consultingID);
          updatedAreas = result.areas;
          newMeanVelocity = result.meanVelocity;
          assistantMessage = validated.assistantMessage;
        } else {
          const validated = FollowUpResponseSchema.parse(tokenLimitResponse);
          questionsToSend = this.mapQuestions(validated.questions);
          const result = await this.handleFollowUpKpis(
            validated,
            consultingRecord.areas,
            data.consultingID,
            data.responses!.length,
          );
          updatedAreas = result.areas;
          newMeanVelocity = result.meanVelocity;
          assistantMessage = validated.assistantMessage;
        }

        let responseToForm = await FormParser.parseAgentResponseToForm(
          {
            questions: questionsToSend,
            consultingID: data.consultingID,
            formID: data.formID,
            isFirstForm: false,
            assistantMessage: assistantMessage,
            meanVelocity: newMeanVelocity,
          },
          numQuestionsAns,
          newMeanVelocity,
        );

        const currentArea = updatedAreas.find(
          (a) => a.status === StatusArea.IN_PROGRESS,
        );

        responseToForm.currentArea = currentArea
          ? {
              id: currentArea.areaId,
              name: currentArea.name,
              actualScore: currentArea.actualScore,
              previousScore: currentArea.previousScore,
              status: StatusArea[currentArea.status],
            }
          : undefined;

        responseToForm.allAreas = updatedAreas.map((area) => ({
          id: area.areaId,
          name: area.name,
          actualScore: area.actualScore,
          previousScore: area.previousScore,
          status: StatusArea[area.status],
        }));
        responseToForm.meanVelocity = newMeanVelocity;

        return responseToForm;
      }

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error("No text response from Groq");
      }

      const jsonResponse = this.parseStructuredJson(rawContent);

      let questionsToSend: IFormFieldToSend[] = [];
      let updatedAreas: ConsultingKpiArea[] = [];
      let newMeanVelocity: number = consultingRecord.meanVelocity ?? 0;
      let assistantMessage: string = "";

      if (isFirstForm) {
        const validated = InitResponseSchema.parse(jsonResponse);
        questionsToSend = this.mapQuestions(validated.questions);
        const result = await this.handleInitKpis(validated, data.consultingID);
        updatedAreas = result.areas;
        newMeanVelocity = result.meanVelocity;
        assistantMessage = validated.assistantMessage;
      } else {
        const validated = FollowUpResponseSchema.parse(jsonResponse);
        questionsToSend = this.mapQuestions(validated.questions);
        const result = await this.handleFollowUpKpis(
          validated,
          consultingRecord.areas,
          data.consultingID,
          data.responses!.length,
        );
        updatedAreas = result.areas;
        newMeanVelocity = result.meanVelocity;
        assistantMessage = validated.assistantMessage;
      }
      //Console log para debuggear el contenido de las preguntas a enviar al frontend
      console.log(questionsToSend);

      const hasPendingAreas = updatedAreas.some(
        (a) => a.status !== StatusArea.COMPLETED,
      );
      const limitQuestionsReached = numQuestionsAns >= this.MAX_NUM_QUESTIONS;
      const generateProposal = !hasPendingAreas || limitQuestionsReached;

      let responseToForm = await FormParser.parseAgentResponseToForm(
        {
          questions: questionsToSend,
          consultingID: data.consultingID,
          formID: data.formID,
          isFirstForm: false,
          assistantMessage: assistantMessage,
          meanVelocity: newMeanVelocity,
        },
        numQuestionsAns,
        newMeanVelocity,
      );

      const currentArea = updatedAreas.find(
        (a) => a.status === StatusArea.IN_PROGRESS,
      );

      const mappedCurrentArea = currentArea
        ? {
            id: currentArea.areaId,
            name: currentArea.name,
            actualScore: currentArea.actualScore,
            previousScore: currentArea.previousScore,
            status: StatusArea[currentArea.status],
          }
        : undefined;

      const mappedAllAreas = updatedAreas.map((area) => ({
        id: area.areaId,
        name: area.name,
        actualScore: area.actualScore,
        previousScore: area.previousScore,
        status: StatusArea[area.status],
      }));

      if (generateProposal) {
        responseToForm.questions = [];
        responseToForm.shouldGenerateProposal = true;
      }

      responseToForm.currentArea = mappedCurrentArea;
      responseToForm.allAreas = mappedAllAreas;
      responseToForm.meanVelocity = newMeanVelocity;

      return responseToForm;
    } catch (error) {
      console.error("Error processing AI response:", error);
      throw error;
    }
  }

  private static buildPromptWithInstructions(prompt: string): string {
    return `${this.GROQ_ASSISTANT_INSTRUCTIONS}\n\n${prompt}`;
  }

  private static parseStructuredJson(content: string): unknown {
    const cleanContent = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    try {
      return JSON.parse(cleanContent);
    } catch {
      throw new Error("Groq response is not valid JSON");
    }
  }

  private static buildTokenLimitResponse(responseType: ResponseType):
    | InitResponse
    | FollowUpResponse {
    const assistantMessage =
      "La respuesta se ha cortado por límite de tokens. Vuelve a intentarlo y reduciré el detalle para completarla.";

    if (responseType === ResponseType.INIT) {
      return {
        areas_detected: [
          {
            name: "Diagnóstico pendiente",
            initial_score: 0,
            summary:
              "La respuesta se ha cortado por límite de tokens y no se pudo completar el diagnóstico.",
          },
          {
            name: "Diagnóstico pendiente adicional",
            initial_score: 0,
            summary:
              "Se necesita reintentar la respuesta para obtener áreas y preguntas completas.",
          },
        ],
        questions: [],
        assistantMessage,
      };
    }

    return {
      kpi_analysis: {
        new_score: 0,
        useful_answers_count: 0,
        updated_summary:
          "La respuesta se ha cortado por límite de tokens y no se pudo completar la actualización del análisis.",
      },
      target_area_id: this.AREA_FINISHED,
      questions: [],
      assistantMessage,
    };
  }

  /**
   * Initializes ConsultingKpiArea records from first AI response with detected areas.
   * Calculates initial meanVelocity as the average of initial area scores.
   *
   * @param response - Initial AI response containing detected problem areas
   * @param consultingId - ID of the consulting session
   * @returns Saved area entities and initial meanVelocity
   */
  private static async handleInitKpis(
    response: InitResponse,
    consultingId: number,
  ): Promise<{ areas: ConsultingKpiArea[]; meanVelocity: number }> {
    const consulting = await this.consultingRepo.findOne({
      where: { id: consultingId },
    });
    if (!consulting) throw new Error("Consulting not found");

    const areas: ConsultingKpiArea[] = response.areas_detected.map(
      (area, index) => {
        const entity = this.consultingKpiAreaRepo.create({
          areaId: `area_${index}_${Date.now()}`,
          name: area.name,
          actualScore: area.initial_score,
          previousScore: 0,
          numQuestions: 0,
          summary: area.summary,
          status: index === 0 ? StatusArea.IN_PROGRESS : StatusArea.PENDING,
          consulting: consulting,
        });
        return entity;
      },
    );

    const savedAreas = await this.consultingKpiAreaRepo.save(areas);

    // Calculate initial meanVelocity as average of initial scores
    const initialVelocity =
      savedAreas.length > 0
        ? savedAreas.reduce((sum, area: any) => sum + area.actualScore, 0) /
          savedAreas.length
        : 0;

    return { areas: savedAreas, meanVelocity: initialVelocity };
  }

  /**
   * Updates ConsultingKpiArea records based on follow-up AI analysis and manages area transitions.
   *
   * The meanVelocity is calculated ONLY for the specific area that was analyzed in this form:
   * - Formula: (actualScore - previousScore) / sqrt(numQuestions)
   * - Reflects the efficiency of learning for that particular area
   * - Not diluted by other unchanged areas
   *
   * This approach ensures accurate feedback per form since each form focuses on one area.
   *
   * @param response - Follow-up AI response with KPI analysis and next target area
   * @param currentAreas - Current list of ConsultingKpiArea entities
   * @param consultingId - ID of the consulting session
   * @param numResponses - Number of responses received from the user in this form
   * @returns Updated area entities and meanVelocity for the analyzed area only
   */
  private static async handleFollowUpKpis(
    response: FollowUpResponse,
    currentAreas: ConsultingKpiArea[],
    consultingId: number,
    numResponses: number,
  ): Promise<{ areas: ConsultingKpiArea[]; meanVelocity: number }> {
    const analyzedAreaIndex = currentAreas.findIndex(
      (a) => a.status === StatusArea.IN_PROGRESS,
    );

    if (analyzedAreaIndex !== -1) {
      const area = currentAreas[analyzedAreaIndex];

      area.previousScore = area.actualScore;
      area.actualScore = response.kpi_analysis.new_score;
      area.summary = response.kpi_analysis.updated_summary;

      area.status =
        area.actualScore >= this.MIN_SCORE
          ? StatusArea.COMPLETED
          : StatusArea.PENDING;
      area.numQuestions += numResponses;
    }

    let nextAreaId = response.target_area_id;
    const pendingAreas = currentAreas
      .filter((a) => a.actualScore < this.MIN_SCORE)
      .sort((a, b) => a.actualScore - b.actualScore);
    const targetExists = currentAreas.some((a) => a.areaId === nextAreaId);

    // Si no hay áreas pendientes, forzar finalización
    if (pendingAreas.length === 0) {
      nextAreaId = this.AREA_FINISHED;
    } else if (nextAreaId === this.AREA_FINISHED || !targetExists) {
      nextAreaId = pendingAreas[0].areaId;
    } else {
      // Si eligió un área que YA está completada, redirigimos a una pendiente
      const targetArea = currentAreas.find((a) => a.areaId === nextAreaId);
      if (targetArea && targetArea.actualScore >= this.MIN_SCORE) {
        nextAreaId = pendingAreas[0].areaId;
      }
    }

    // Activar nuevo estado
    if (nextAreaId !== this.AREA_FINISHED) {
      const nextIndex = currentAreas.findIndex((a) => a.areaId === nextAreaId);
      if (nextIndex !== -1) {
        currentAreas[nextIndex].status = StatusArea.IN_PROGRESS;
      }
    }

    currentAreas.forEach((area, index) => {
      if (index !== analyzedAreaIndex) {
        area.previousScore = area.actualScore;
      }
    });

    // Persist updated areas
    const savedAreas = await this.consultingKpiAreaRepo.save(currentAreas);

    // Calculate meanVelocity ONLY for the analyzed area (the one that was IN_PROGRESS)
    let newMeanVelocity = 0;

    if (analyzedAreaIndex !== -1) {
      const analyzedArea = savedAreas[analyzedAreaIndex];

      if (analyzedArea.numQuestions > 0) {
        const scoreImprovement =
          analyzedArea.actualScore - analyzedArea.previousScore;
        // Weighted velocity: improvement / sqrt(numQuestions)
        // Rewards efficient learning (larger improvements with fewer questions)
        newMeanVelocity =
          scoreImprovement / Math.sqrt(analyzedArea.numQuestions);
      }
    }

    return { areas: savedAreas, meanVelocity: newMeanVelocity };
  }

  /**
   * Transforms raw AI question objects into typed form field structures.
   * Automatically adds maxLength validator for textarea fields.
   *
   * @param rawQuestions - Array of untyped question objects from AI response
   * @returns Typed array of form fields ready for frontend consumption
   */
  private static mapQuestions(rawQuestions: any[]): IFormFieldToSend[] {
    const MAX_LENGTH_DEFAULT = 1000;

    return rawQuestions.map((q) => {
      let validators =
        q.validators?.map((v: any) => ({
          type: v.type,
          value: v.value,
          message: v.message || undefined,
        })) || [];

      // Add maxLength validator automatically for textarea fields
      if (q.type === "textarea") {
        validators.push({
          type: "maxLength",
          value: MAX_LENGTH_DEFAULT,
          message: `El texto no puede superar los ${MAX_LENGTH_DEFAULT} caracteres.`,
        });
      }

      return {
        idField: q.idField,
        question: q.question,
        placeholder: q.placeholder,
        type: q.type as "select" | "textarea" | "multiselect",
        required: q.required,
        options: q.options || null,
        validators: validators.length > 0 ? validators : undefined,
        isAnswered: false,
        response: "",
      };
    });
  }

  /**
   * Returns the initial diagnostic form without creating a consulting session.
   * Used when starting a new consultation - the consulting will be created
   * when the user submits the first form.
   *
   * @returns Initial form structure with questions loaded from template
   * @throws {Error} If form template cannot be loaded
   */
  public static async getInitialForm(): Promise<IFormToSend> {
    try {
      const initialFormPath = path.join(
        __dirname,
        "../models/initial_form.json",
      );
      const initialFormDataRaw = fs.readFileSync(initialFormPath, "utf-8");
      const initialFormData = JSON.parse(initialFormDataRaw);

      const formToSend: IFormToSend = {
        questions: initialFormData.questions as IFormFieldToSend[],
        consultingID: -1, // -1 indicates no consulting created yet
        formID: -1, // -1 indicates no form created yet
        isFirstForm: true,
        meanVelocity: 0, // Initial form has no velocity yet
      };

      return formToSend;
    } catch (error) {
      console.error("Error loading initial form:", error);
      throw error;
    }
  }

  /**
   * Fetches all consulting sessions belonging to the specified user.
   * Includes calculated average score from ConsultingKpiArea records.
   *
   * @param userId - User identifier from JWT token
   * @returns Array of consulting sessions with average scores, ordered by date descending
   * @throws {Error} If database query fails
   */
  public static async getAllConsultings(
    userId: number,
  ): Promise<IConsultingListItem[]> {
    try {
      const consultings = await this.consultingRepo.find({
        where: { user: { id: userId } },
        select: ["id", "title", "date", "statusCons", "lastTimeAccessed"],
        relations: ["areas"],
        order: { lastTimeAccessed: "DESC" },
      });

      return consultings.map((consulting: any) => {
        const areas = consulting.areas ?? [];
        const averageScore = areas.length
          ? (areas.reduce((sum: number, area: any) => sum + area.actualScore, 0) /
              areas.length) *
            10
          : 0;

        return {
          id: consulting.id,
          title: consulting.title,
          date: consulting.date,
          statusCons: consulting.statusCons,
          lastTimeAccessed: consulting.lastTimeAccessed,
          averageScore: averageScore,
        };
      });
    } catch (error) {
      console.error("Error fetching consulting sessions:", error);
      throw error;
    }
  }

  /**
   * Fetches a specific consulting session with associated forms.
   * Validates user ownership before retrieval.
   *
   * @param consultingId - Consulting session identifier
   * @param userId - User identifier from JWT token
   * @returns Consulting entity with forms, areas and meanVelocity, or null if not found/unauthorized
   * @throws {Error} If database query fails
   */
  public static async getConsultingById(
    consultingId: number,
    userId: number,
  ): Promise<Consulting | null> {
    try {
      const consulting = await this.consultingRepo.findOne({
        where: {
          id: consultingId,
          user: { id: userId },
        },
        relations: ["forms", "areas"],
      });

      // Update last access time
      if (consulting) {
        await this.consultingRepo.update(
          { id: consultingId },
          { lastTimeAccessed: new Date() },
        );
      }

      return consulting;
    } catch (error) {
      console.error(
        `Error fetching consulting session with ID ${consultingId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Deletes a consulting session and all related data.
   * Validates user ownership before deletion.
  * Cascading deletion will automatically remove associated forms and areas.
   *
   * @param consultingId - Consulting session identifier to delete
   * @param userId - User identifier from JWT token for authorization
   * @returns True if deletion was successful
   * @throws {Error} If consulting not found or user doesn't own the session
   */
  public static async deleteConsulting(
    consultingId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      const consulting = await this.consultingRepo.findOne({
        where: { id: consultingId },
        relations: ["user"],
      });

      if (!consulting) {
        throw new Error(`Consulting session ${consultingId} not found`);
      }

      if (consulting.user.id !== userId) {
        throw new Error(
          "Access denied: You do not own this consulting session",
        );
      }

      await this.consultingRepo.remove(consulting);
      return true;
    } catch (error) {
      console.error(
        `Error deleting consulting session ${consultingId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Updates the title of an existing consulting session.
   * Validates user ownership before allowing the modification.
   *
   * @param consultingId - Consulting session identifier to update
   * @param title - New title for the consulting session
   * @param userId - User identifier from JWT token for authorization
   * @returns True if update was successful
   * @throws {Error} If consulting not found or user doesn't own the session
   */
  public static async setTitle(
    consultingId: number,
    title: string,
    userId: number,
  ): Promise<boolean> {
    try {
      const consulting = await this.consultingRepo.findOne({
        where: { id: consultingId },
        relations: ["user"],
      });

      if (!consulting) {
        throw new Error(`Consulting with ID ${consultingId} not found`);
      }

      if (consulting.user.id !== userId) {
        throw new Error("Access denied: You don't own this consulting session");
      }

      await this.consultingRepo.update({ id: consultingId }, { title });

      return true;
    } catch (error) {
      console.error(
        `Error updating title for consulting ${consultingId}:`,
        error,
      );
      throw error;
    }
  }
}
