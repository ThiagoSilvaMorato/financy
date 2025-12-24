import jwt, { Secret, SignOptions } from "jsonwebtoken";

export type JwtPayload = {
  id: string;
  email: string;
};

export const signJwt = (payload: JwtPayload, expiresIn?: string): string => {
  const secret: Secret = process.env.JWT_SECRET as unknown as Secret;
  console.log("JWT_SECRET:", process.env.JWT_SECRET, secret);

  let options: SignOptions;
  const expiration = expiresIn;

  if (expiration) {
    options = { expiresIn: expiration as unknown as NonNullable<SignOptions["expiresIn"]> };
  }

  return jwt.sign(payload, secret, options);
};

export const verifyJwt = (token: string): JwtPayload => {
  const secret: Secret = process.env.JWT_SECRET as unknown as Secret;
  return jwt.verify(token, secret) as JwtPayload;
};
