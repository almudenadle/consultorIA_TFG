import { Request, Response } from "express";
import { ConsultingService } from "../services/consulting.service";
import { GenResponse } from "../models/interfaces/gen_response.interface";

export class ConsultingController {
  /**
   * Returns the initial diagnostic form without creating a consulting session.
   * The consulting will be created when the user submits the first form.
   * No authentication required for this endpoint.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @returns Promise resolving to GenResponse with initial form data
   */
  public static async getInitialForm(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();

    try {
      const initialForm = await ConsultingService.getInitialForm();

      resp.code = 200;
      resp.msg = "Initial form retrieved successfully";
      resp.data = initialForm;
      res.status(200).json(resp);
    } catch (error) {
      console.error("Error in getInitialForm controller:", error);
      resp.msg =
        error instanceof Error
          ? error.message
          : "Error retrieving initial form";
      resp.code = 500;
      res.status(500).json(resp);
    }
  }

  /**
   * Retrieves all consulting sessions for the authenticated user.
   * Extracts user ID from JWT token and returns lightweight consulting data.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @returns Promise resolving to GenResponse with array of consulting sessions
   */
  public static async getAllConsultings(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();

    try {
      // Get user ID from JWT token
      const tokenId = res.locals.user?.id;
      const result = await ConsultingService.getAllConsultings(tokenId);

      resp.code = 200;
      resp.msg = "Consulting sessions retrieved successfully";
      resp.data = result;
      res.status(200).json(resp);
    } catch (error) {
      if (error instanceof Error) {
        resp.code = 500;
        resp.msg = error.message || "Internal server error";
        resp.data = null;
      } else {
        resp.code = 500;
        resp.msg = "An unexpected error occurred";
        resp.data = null;
      }

      res.status(resp.code).json(resp);
    }
  }

  /**
   * Handles incoming form data from clients and processes it through the consulting service.
   * Validates input, sends to AI assistant, and returns the next set of questions.
   *
   * @param req - Express request containing form data in body
   * @param res - Express response object
   * @returns Promise resolving to GenResponse with AI-generated questions
   */
  public static async sendMessage(req: Request, res: Response): Promise<void> {
    const resp = new GenResponse();

    try {
      if (!req.body) {
        resp.code = 400;
        resp.msg = "Request body is required";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      const { consultingID, formID } = req.body;
      if (!consultingID || !formID) {
        resp.code = 400;
        resp.msg = "consultingID and formID are required fields";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      // Get user ID from JWT token for security validation
      const userId = res.locals.user.id;

      const result = await ConsultingService.sendMessage(req.body, userId);

      resp.code = 200;
      resp.msg = "Message processed successfully";
      resp.data = result;
      res.status(200).json(resp);
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's an authorization error
        if (error.message.includes("Access denied")) {
          resp.code = 403;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("not found")) {
          resp.code = 404;
          resp.msg = error.message;
          resp.data = null;
        } else {
          resp.code = 500;
          resp.msg = error.message || "Internal server error";
          resp.data = null;
        }
      } else {
        resp.code = 500;
        resp.msg = "An unexpected error occurred";
        resp.data = null;
      }

      res.status(resp.code).json(resp);
    }
  }

  /**
   * Retrieves detailed information about a specific consulting session.
   * Validates the consulting ID format, ensures user ownership, and returns
   * the complete consulting record with all associated forms.
   *
   * @param req - Express request containing consulting ID in URL params
   * @param res - Express response object with authenticated user data in locals
   * @returns Promise resolving to GenResponse with consulting data including forms
   * @throws Returns 400 if consulting ID is invalid
   * @throws Returns 404 if consulting not found or doesn't belong to user
   * @throws Returns 500 if database operation fails
   */
  public static async getConsultingById(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();

    try {
      const consultingID = parseInt(req.params.id, 10);
      if (isNaN(consultingID)) {
        resp.code = 400;
        resp.msg = "Invalid consulting ID";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }
      const userId = res.locals.user.id;
      const consultingData = await ConsultingService.getConsultingById(
        consultingID,
        userId,
      );

      if (!consultingData) {
        resp.code = 404;
        resp.msg = "Consulting session not found or does not belong to user.";
        resp.data = null;
        res.status(404).json(resp);
        return;
      }

      resp.code = 200;
      resp.msg = "Consulting session retrieved successfully";
      resp.data = consultingData;
      res.status(200).json(resp);
    } catch (error) {
      console.error("Error in getConsultingById controller:", error);
      resp.msg =
        error instanceof Error
          ? error.message
          : "Error retrieving consulting session";
      resp.code = 500;
      resp.data = null;
      res.status(500).json(resp);
    }
  }

  /**
   * Deletes a consulting session and all associated data.
   * Validates consulting ownership before deletion.
   * Cascade deletion removes all related forms and reports automatically.
   *
   * @param req - Express request containing consulting ID in URL params
   * @param res - Express response object with authenticated user data in locals
   * @returns Promise resolving to GenResponse confirming deletion
   * @throws Returns 400 if consulting ID is invalid
   * @throws Returns 403 if user doesn't own the consulting
   * @throws Returns 404 if consulting not found
   */
  public static async deleteConsulting(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();

    try {
      const consultingId = parseInt(req.params.id, 10);

      if (isNaN(consultingId)) {
        resp.code = 400;
        resp.msg = "Invalid consulting ID format";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      const userId = res.locals.user.id;

      await ConsultingService.deleteConsulting(consultingId, userId);

      resp.code = 200;
      resp.msg = "Consulting session deleted successfully";
      resp.data = { deleted: true };
      res.status(200).json(resp);
    } catch (error) {
      console.error("Error in deleteConsulting controller:", error);

      if (error instanceof Error) {
        if (error.message.includes("Access denied")) {
          resp.code = 403;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("not found")) {
          resp.code = 404;
          resp.msg = error.message;
          resp.data = null;
        } else {
          resp.code = 500;
          resp.msg = error.message || "Internal server error";
          resp.data = null;
        }
      } else {
        resp.code = 500;
        resp.msg = "An unexpected error occurred while deleting consulting";
        resp.data = null;
      }

      res.status(resp.code).json(resp);
    }
  }

  /**
   * Updates the title of an existing consulting session.
   * Validates consulting ownership before allowing the update.
   *
   * @param req - Express request containing consultingId and title in body
   * @param res - Express response object with authenticated user data in locals
   * @returns Promise resolving to GenResponse confirming title update
   * @throws Returns 400 if consultingId or title are missing or invalid
   * @throws Returns 403 if user doesn't own the consulting
   * @throws Returns 404 if consulting not found
   */
  public static async setTitle(req: Request, res: Response): Promise<void> {
    const resp = new GenResponse();

    try {
      const { consultingId, title } = req.body;

      if (!consultingId || !title) {
        resp.code = 400;
        resp.msg = "consultingId and title are required fields";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      if (typeof title !== "string" || title.trim().length === 0) {
        resp.code = 400;
        resp.msg = "Title must be a non-empty string";
        resp.data = null;
        res.status(400).json(resp);
        return;
      }

      const userId = res.locals.user.id;

      await ConsultingService.setTitle(consultingId, title, userId);

      resp.code = 200;
      resp.msg = "Consulting title updated successfully";
      resp.data = true;
      res.status(200).json(resp);
    } catch (error) {
      console.error("Error in setTitle controller:", error);

      if (error instanceof Error) {
        if (error.message.includes("Access denied")) {
          resp.code = 403;
          resp.msg = error.message;
          resp.data = null;
        } else if (error.message.includes("not found")) {
          resp.code = 404;
          resp.msg = error.message;
          resp.data = null;
        } else {
          resp.code = 500;
          resp.msg = error.message || "Internal server error";
          resp.data = null;
        }
      } else {
        resp.code = 500;
        resp.msg = "An unexpected error occurred while updating title";
        resp.data = null;
      }

      res.status(resp.code).json(resp);
    }
  }
}
