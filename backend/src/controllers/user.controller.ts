import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { GenResponse } from "../models/interfaces/gen_response.interface";

export class UserController {
  /**
          Create a new company and user
          @param req - Express request object
          @param res - Express response object
      */
  public static async createUserAndCompany(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();
    try {
      const { user, company } = req.body;
      if (!user || !company) {
        resp.msg = "User and Company data are required";
        resp.code = 400;
        res.json(resp);
        return;
      }

      if ((await UserService.checkInputData(user, company, resp)) === false) {
        resp.code = 400;
        res.json(resp);
        return;
      }

      const createdCompany = await UserService.createCompany(company);
      const createdUser = await UserService.createUser(user, createdCompany.id);

      resp.msg = "User and Company created successfully";
      resp.code = 201;
      resp.data = createdUser;
    } catch (error: any) {
      resp.msg = error.message || "Error creating User and Company";
      resp.code = 500;
    }
    res.json(resp);
  }

  /**
   * Log in a user and return a JWT token
   * @param req - Express request object
   * @param res - Express response object
   */
  public static async authenticateUser(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();
    try {
      const { userId, password } = req.body;

      if (!userId || !password) {
        resp.msg = "userId and password are required";
        resp.code = 400;
        res.json(resp);
        return;
      }

      const token = await UserService.authenticateUser({ userId, password });

      resp.msg = "Authentication successful";
      resp.code = 200;
      resp.data = token;
    } catch (error: any) {
      resp.msg = error.message || "Error during authentication";
      resp.code = 500;
    }
    res.json(resp);
  }

  /**
   * Get user data by ID
   * @param req - Express request object
   * @param res - Express response object
   */
  public static async getUserById(req: Request, res: Response): Promise<void> {
    const resp = new GenResponse();
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        resp.msg = "Invalid user ID";
        resp.code = 400;
        res.json(resp);
        return;
      }

      const user = await UserService.getUserById(userId);

      resp.msg = "User retrieved successfully";
      resp.code = 200;
      resp.data = user;
    } catch (error: any) {
      resp.msg = error.message || "Error retrieving user";
      resp.code = 500;
    }
    res.json(resp);
  }

  /**
   * Get user email from authenticated user token
   * @param req - Express request object
   * @param res - Express response object
   */
  public static async getUserEmail(req: Request, res: Response): Promise<void> {
    const resp = new GenResponse();
    try {
      const userId = res.locals.user.id;

      const userEmail = await UserService.getUserEmail(userId);

      resp.msg = "User email retrieved successfully";
      resp.code = 200;
      resp.data = userEmail;
    } catch (error: any) {
      resp.msg = error.message || "Error retrieving user email";
      resp.code = 500;
    }
    res.json(resp);
  }

  /**
   * Get user profile information
   * @param req - Express request object
   * @param res - Express response object
   */
  public static async getProfile(req: Request, res: Response): Promise<void> {
    const resp = new GenResponse();
    try {
      const userId = res.locals.user.id;

      const profileData = await UserService.getUserProfile(userId);

      resp.msg = "Profile retrieved successfully";
      resp.code = 200;
      resp.data = profileData;
    } catch (error: any) {
      resp.msg = error.message || "Error retrieving profile";
      resp.code = 500;
    }
    res.json(resp);
  }

  /**
   * Change user password
   * @param req - Express request object
   * @param res - Express response object
   */
  public static async changePassword(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();
    try {
      const userId = res.locals.user.id;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        resp.msg = "Old password and new password are required";
        resp.code = 400;
        res.json(resp);
        return;
      }

      await UserService.changePassword(userId, oldPassword, newPassword);

      resp.msg = "Password changed successfully";
      resp.code = 200;
    } catch (error: any) {
      resp.msg = error.message || "Error changing password";
      resp.code = 500;
    }
    res.json(resp);
  }

  /**
   * Update user profile information
   * @param req - Express request object
   * @param res - Express response object
   */
  public static async updateProfile(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();
    try {
      const userId = res.locals.user.id;
      const { name, lastName, userName, mail } = req.body;

      const updatedUser = await UserService.updateProfile(userId, {
        name,
        lastName,
        mail,
        userId: userName,
      });

      resp.msg = "Profile updated successfully";
      resp.code = 200;
      resp.data = {
        name: updatedUser.name,
        lastName: updatedUser.lastName,
        mail: updatedUser.mail,
        userId: updatedUser.userId,
      };
    } catch (error: any) {
      resp.msg = error.message || "Error updating profile";
      resp.code = 500;
    }
    res.json(resp);
  }

  /**
   * Update company information
   * @param req - Express request object
   * @param res - Express response object
   */
  public static async updateCompany(
    req: Request,
    res: Response,
  ): Promise<void> {
    const resp = new GenResponse();
    try {
      const userId = res.locals.user.id;
      const { name, size, sector } = req.body;

      const updatedCompany = await UserService.updateCompany(userId, {
        name,
        size,
        sector,
      });

      resp.msg = "Company updated successfully";
      resp.code = 200;
      resp.data = {
        name: updatedCompany.name,
        size: updatedCompany.size,
        sector: updatedCompany.sector,
      };
    } catch (error: any) {
      resp.msg = error.message || "Error updating company";
      resp.code = 500;
    }
    res.json(resp);
  }
}
