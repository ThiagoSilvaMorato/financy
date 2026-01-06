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

async function bootstrap() {
  const app = express();

  app.use(
    cors({
      origin: "http://localhost:5174",
      credentials: true,
    })
  );

  const schema = await buildSchema({
    resolvers: [AuthResolver, UserResolver, CategoryResolver, TransactionResolver],
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

  app.listen({ port: 4000 }, () => {
    console.log("🚀 Server is running on http://localhost:4000/graphql");
  });
}

bootstrap();
