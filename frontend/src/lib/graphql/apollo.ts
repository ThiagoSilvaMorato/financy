import { useAuthStore } from "@/stores/auth";
import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";

const httpLink = new HttpLink({
  uri: "http://localhost:4000/graphql",
});

const authLink = new SetContextLink((prevContext) => {
  const token = useAuthStore.getState().token;

  console.log("Setting auth token in Apollo Client:", token);

  return {
    headers: {
      ...prevContext.headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache(),
});
