import { ApolloClient, InMemoryCache } from '@apollo/client';

const apolloClient = new ApolloClient({
  uri: 'https://indexer-graphql-api.onrender.com/',
  cache: new InMemoryCache(),
});

export const apolloClientForUserValues = new ApolloClient({
  uri: 'https://troves-indexers-graph-api-ekubo-temp.onrender.com/',
  cache: new InMemoryCache(),
});

export default apolloClient;
