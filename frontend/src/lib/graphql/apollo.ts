import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, Observable } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { useAuthStore } from "@/stores/auth";
import { onError } from "@apollo/client/link/error";

const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql",
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
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
