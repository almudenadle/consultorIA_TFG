import OpenAI from "openai";

/**
 * Singleton client for Groq API (OpenAI-compatible endpoint).
 * Ensures a single shared instance is used across all services.
 * 
 * @example
 * ```typescript
 * const groq = OpenAIClient.getInstance();
 * const response = await groq.chat.completions.create({...});
 * ```
 */
export class OpenAIClient {
  private static instance: OpenAI | null = null;

  /**
   * Private constructor to prevent direct instantiation.
   * Use getInstance() instead.
   */
  private constructor() {}

  /**
   * Returns the singleton instance of the OpenAI client.
   * Creates the instance on first call using the GROQ_APY_KEY environment variable.
   * 
   * @returns The shared OpenAI client instance
   * @throws {Error} If GROQ_APY_KEY environment variable is not set
   */
  public static getInstance(): OpenAI {
    if (!this.instance) {
      const apiKey = process.env.GROQ_APY_KEY || process.env.GROQ_API_KEY;

      if (!apiKey) {
        throw new Error("GROQ_APY_KEY environment variable is not set");
      }
      
      this.instance = new OpenAI({ 
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
      });
    }
    
    return this.instance;
  }

  /**
   * Resets the singleton instance.
   * Useful for testing purposes or when the API key needs to be refreshed.
   */
  public static resetInstance(): void {
    this.instance = null;
  }
}
