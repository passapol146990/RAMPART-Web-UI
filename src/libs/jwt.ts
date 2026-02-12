import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export type TokenType = "login_confirm" | "login_success";

export function signAccessToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: payload.expires_in || "1h",
  });
}

export function verifyAccessToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
