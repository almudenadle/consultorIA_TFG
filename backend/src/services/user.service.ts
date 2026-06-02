import { DB } from "../config/typeorm";
import { User } from "../entities/user.entity";
import { Company } from "../entities/company.entity";
import { AccessLog } from "../entities/access_log.entity";
import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";
import { GenResponse } from "../models/interfaces/gen_response.interface";
import { ProfileData } from "../models/interfaces/profile_data.interface";

/**
 * Service handling user authentication, registration, and company management operations.
 * Provides secure user creation with password hashing and JWT-based authentication.
 */
export class UserService {
  private static userRepository = DB.getRepository(User);
  private static companyRepository = DB.getRepository(Company);

  /**
   * Validates user and company input data for registration.
   * Checks required fields and verifies user uniqueness.
   *
   * @param user - Partial user data containing userId, password, and email
   * @param company - Partial company data containing name
   * @param resp - Response object to populate with error messages
   * @returns Promise resolving to true if data is valid, false otherwise
   */
  public static async checkInputData(
    user: Partial<User>,
    company: Partial<Company>,
    resp: GenResponse,
  ): Promise<boolean> {
    if (!user.userId || !user.password || !user.mail) {
      resp.msg = "User credentials need to be filled";
      return false;
    }
    if (!company.name) {
      resp.msg = "There must be a company name";
      return false;
    }

    if (
      await this.userRepository.findOne({
        where: [{ userId: user.userId! }, { mail: user.mail! }],
      })
    ) {
      resp.msg = "User account alredy exists";
      return false;
    }
    return true;
  }

  /**
   * Creates and persists a new company record in the database.
   *
   * @param companyData - Partial company data including name and sector
   * @returns Promise resolving to the newly created company entity
   */
  public static async createCompany(
    companyData: Partial<Company>,
  ): Promise<Company> {
    const newCompany = this.companyRepository.create(companyData);
    return await this.companyRepository.save(newCompany);
  }

  /**
   * Creates a new user with SHA-256 hashed password and links to a company.
   *
   * @param user - Partial user data including userId, password, and email
   * @param companyId - ID of the company to associate with the user
   * @returns Promise resolving to the created user entity
   * @throws {Error} If password is missing or company is not found
   */
  public static async createUser(
    user: Partial<User>,
    companyId: number,
  ): Promise<User> {
    if (!user.password) {
      throw new Error("Password is required");
    }

    const password = CryptoJS.SHA256(user.password).toString(
      CryptoJS.enc.Base64,
    );
    user.password = password;

    const company = await this.companyRepository.findOneBy({ id: companyId });
    if (!company) {
      throw new Error("Company not found");
    }
    user.company = company;

    return await this.userRepository.save(user);
  }

  /**
   * Authenticates a user and generates a JWT token.
   * Logs all access attempts (successful and failed) for security auditing.
   *
   * @param data - Object containing userId and plain-text password
   * @returns Promise resolving to an object containing the JWT token
   * @throws {Error} If user is not found or password is invalid
   */
  public static async authenticateUser(data: {
    userId: string;
    password: string;
  }): Promise<{ token: string }> {
    const log = new AccessLog();

    const user = await this.userRepository.findOne({
      where: { userId: data.userId },
      select: ["id", "userId", "password"],
    });

    if (!user) {
      log.success = false;
      await DB.getRepository(AccessLog).save(log);
      throw new Error("User not found");
    }

    log.user = user;

    const hashedPassword = CryptoJS.SHA256(data.password).toString(
      CryptoJS.enc.Base64,
    );

    if (user.password !== hashedPassword) {
      log.success = false;
      await DB.getRepository(AccessLog).save(log);
      throw new Error("Invalid password");
    }

    log.success = true;
    await DB.getRepository(AccessLog).save(log);

    const tokenPayload = { id: user.id };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET as string, {
      expiresIn: "1h",
    });

    return { token };
  }

  /**
   * Retrieves user data by user ID.
   * Returns user information excluding password for security.
   *
   * @param userId - The numeric ID of the user
   * @returns Promise resolving to user data without password
   * @throws {Error} If user is not found
   */
  public static async getUserById(userId: number): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "userId", "name", "lastName", "mail"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Retrieves the email address of a user by their ID.
   *
   * @param userId - The numeric ID of the user
   * @returns Promise resolving to an object containing the user's email
   * @throws {Error} If user is not found
   */
  public static async getUserEmail(userId: number): Promise<{ mail: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["mail"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    return { mail: user.mail };
  }

  /**
   * Retrieves user profile information including company details.
   *
   * @param userId - The ID of the user
   * @returns Promise resolving to profile data with user and company information
   * @throws {Error} If user or company is not found
   */
  public static async getUserProfile(userId: number): Promise<ProfileData> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["company"],
    });

    if (!user || !user.company) {
      throw new Error("User or company not found");
    }

    return {
      user: {
        name: user.name,
        lastName: user.lastName,
        userName: user.userId,
        mail: user.mail,
      },
      company: {
        name: user.company.name,
        size: user.company.size,
        sector: user.company.sector,
      },
    };
  }

  /**
   * Changes user password after verifying the old password.
   *
   * @param userId - The ID of the user
   * @param oldPassword - Current password for verification
   * @param newPassword - New password to set
   * @throws {Error} If user is not found or old password is invalid
   */
  public static async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["id", "password"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    const hashedOldPassword = CryptoJS.SHA256(oldPassword).toString(
      CryptoJS.enc.Base64,
    );

    if (user.password !== hashedOldPassword) {
      throw new Error("Invalid old password");
    }

    const hashedNewPassword = CryptoJS.SHA256(newPassword).toString(
      CryptoJS.enc.Base64,
    );

    user.password = hashedNewPassword;
    await this.userRepository.save(user);
  }

  /**
   * Updates user profile information (name, lastName, mail, userId).
   *
   * @param userId - The ID of the user
   * @param data - Partial user data to update
   * @returns The updated user
   * @throws {Error} If user is not found, email already exists, or userId already exists
   */
  public static async updateProfile(
    userId: number,
    data: Partial<Pick<User, "name" | "lastName" | "mail" | "userId">>,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (data.mail && data.mail !== user.mail) {
      const existingUser = await this.userRepository.findOne({
        where: { mail: data.mail },
      });
      if (existingUser) {
        throw new Error("Email already in use");
      }
    }

    if (data.userId && data.userId !== user.userId) {
      const existingUser = await this.userRepository.findOne({
        where: { userId: data.userId },
      });
      if (existingUser) {
        throw new Error("Username already in use");
      }
    }

    Object.assign(user, data);
    return await this.userRepository.save(user);
  }

  /**
   * Updates company information.
   *
   * @param userId - The ID of the user (to find their company)
   * @param data - Partial company data to update
   * @throws {Error} If user or company is not found
   */
  public static async updateCompany(
    userId: number,
    data: Partial<Pick<Company, "name" | "size" | "sector">>,
  ): Promise<Company> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["company"],
    });

    if (!user || !user.company) {
      throw new Error("User or company not found");
    }

    Object.assign(user.company, data);
    return await this.companyRepository.save(user.company);
  }
}
