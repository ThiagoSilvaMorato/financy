import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, Observable } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { useAuthStore } from "@/stores/auth";
import { useEnvironmentStore } from "@/stores/environment";
import { onError } from "@apollo/client/link/error";
import { env } from "@/env";

const httpLink = new HttpLink({
  uri: env.VITE_BACKEND_URL,
  credentials: "include",
});

const authLink = new SetContextLink((prevContext): { headers: Record<string, string> } => {
  const token = useAuthStore.getState().token;

  return {
    headers: {
      ...prevContext.headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const errorLink = onError((error) => {
  const { operation, forward } = error;
  const graphQLError = error.error.message;

  if (!graphQLError) return;

  if (graphQLError === "Unauthenticated") {
    return new Observable((observer) => {
      useAuthStore
        .getState()
        .refreshSession()
        .then((accessToken) => {
          if (!accessToken) {
            observer.error(graphQLError);
            return;
          }

          operation.setContext(({ headers = {} }: { headers?: Record<string, string> }) => ({
            headers: {
              ...headers,
              authorization: `Bearer ${accessToken}`,
            },
          }));

          forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        })
        .catch(observer.error.bind(observer));
    });
  }

  if (
    graphQLError === "Você não tem acesso a este ambiente." ||
    graphQLError === "Seu acesso a este ambiente ainda não foi aprovado por um administrador."
  ) {
    // Ambiente ativo ficou inacessível (removido/excluído, sessão em outra aba perdeu acesso,
    // ou a checagem proativa de `pending` na própria tela falhou por algum motivo). Cai para o
    // ambiente pessoal em segundo plano; as telas que dependem de currentEnvironmentId refazem a
    // busca sozinhas quando ele muda. Rede de segurança, não o mecanismo principal — o normal é a
    // UI tratar `pending` proativamente a partir de `myMembership` antes de disparar essas queries.
    useEnvironmentStore.getState().refreshEnvironments();
  }
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
