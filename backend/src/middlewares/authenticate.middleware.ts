// middlewares/authenticate.ts
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { GenResponse } from "../models/interfaces/gen_response.interface";

/*
    Middleware to authenticate requests using JWT tokens.
    It checks for the Authorization header, verifies the token,
    and attaches the decoded user information to res.locals.user.
    If the token is missing or invalid, it responds with a 401 status code.
*/
export default async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.header("Authorization");
  //le quitamos el bearer
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;
  const resp = new GenResponse();

  if (!token) {
    resp.msg = "Authorization token is required.";
    resp.code = 401;
    res.json(resp);
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    res.locals.user = decoded;
    next();
  } catch (err) {
    resp.msg = "Invalid token.";
    resp.code = 401;
    res.json(resp);
  }
}
