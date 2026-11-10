import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

const port = Number(process.env.PORT ?? 4000);
const ordersUrl = process.env.ORDERS_SUBGRAPH_URL ?? 'http://localhost:5000/graphql';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [{ name: 'orders', url: ordersUrl }],
  }),
});

const server = new ApolloServer({ gateway });

const { url } = await startStandaloneServer(server, { listen: { port } });
console.log(`Gateway listo en ${url} -> subgrafo orders: ${ordersUrl}`);
