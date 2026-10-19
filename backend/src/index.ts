import "reflect-metadata";
import "dotenv/config";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import express from "express";
import { AuthResolver } from "./resolvers/auth.resolver";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/user.resolver";
import { buildContext } from "./graphql/context";
import { CategoryResolver } from "./resolvers/category.resolver";
import { TransactionResolver } from "./resolvers/transaction.resolver";
import { EnvironmentMemberResolver, EnvironmentResolver } from "./resolvers/environment.resolver";

const defaultCorsOrigins = ["http://localhost:5173", "http://localhost:5174"];

function getCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);
  return fromEnv?.length ? fromEnv : defaultCorsOrigins;
}

async function bootstrap() {
  const app = express();
  const corsOrigins = getCorsOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    })
  );

  const schema = await buildSchema({
    resolvers: [
      AuthResolver,
      UserResolver,
      CategoryResolver,
      TransactionResolver,
      EnvironmentResolver,
      EnvironmentMemberResolver,
    ],
    validate: false,
    emitSchemaFile: "./schema.graphql",
  });

  const server = new ApolloServer({
    schema,
    plugins: [
      {
        async requestDidStart() {
          return {
            async willSendResponse(requestContext) {
              const res = (requestContext.contextValue as any)?.res as express.Response | undefined;
              if (!res) return;

              const errors =
                (requestContext.response as any)?.errors ??
                (requestContext.response as any)?.body?.errors;
              if (errors && (errors as any[]).length > 0) {
                const hasAuth = (errors as any[]).some(
                  (e) => e.extensions?.code === "UNAUTHENTICATED"
                );
                if (hasAuth) {
                  res.status(401);
                  return;
                }
                res.status(400);
                return;
              }
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    "/graphql",
    express.json(),
    expressMiddleware(server, {
      context: buildContext,
    })
  );

  const port = Number(process.env.PORT) || 4000;
  app.listen({ port }, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
}

bootstrap();
