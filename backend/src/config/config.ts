import dotenv from "dotenv";
import Joi from "joi";

// We load the environment variables from the .env file.
const config = dotenv.config();


// We validate environment variables with Joi
const envSchema = Joi.object({
  DB_HOST: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASS: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string().required(),
  GROQ_API_KEY: Joi.string().required(),
  GROQ_MODEL: Joi.string().optional(),
})
  .unknown()
  .required();

// Validate environment variables
const { error, value } = envSchema.validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Create a centralized configuration object
const configEnv = {
  ENV: value.NODE_ENV,
  PORT: value.PORT,
  db: {
    host: value.DB_HOST,
    port: value.DB_PORT,
    user: value.DB_USER,
    password: value.DB_PASS,
    name: value.DB_NAME,
  },
};

export default configEnv;
