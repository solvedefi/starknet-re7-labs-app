import { ApolloClient, InMemoryCache } from '@apollo/client';

const apolloClient = new ApolloClient({
  uri:
    process.env.NEXT_PUBLIC_INDEXER_URL ||
    'https://indexer-graphql-api.onrender.com/',
  cache: new InMemoryCache(),
});

export default apolloClient;
