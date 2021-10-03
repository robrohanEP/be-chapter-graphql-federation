import { ApolloServer, gql } from "apollo-server-express";
import { buildSubgraphSchema } from "@apollo/federation";
import express from "express";
import fetch from "node-fetch";
import { log } from "./log";
import { initSpiker } from "./spiker";

(async () => {
  const [typeDefs, resolvers] = initSpiker();
  log(resolvers);

  const app = express();
  const corsOptions = {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: false,
  };

  // Setup JWT authentication middleware
  // app.use(async (req, res, next) => {
  //   const token = req.headers["authorization"];
  //   if (token !== "null") {
  //     // try {
  //     //   const currentUser = await jwt.verify(token, process.env.SECRET)
  //     //   req.currentUser = currentUser
  //     // } catch(e) {
  //     //   console.error(e);
  //     // }
  //   }
  //   next();
  // });

  log(`Starting Express / Apollo with cors...`);
  // const server = new ApolloServer({
  //   cors: corsOptions,
  //   typeDefs,
  //   resolvers,
  //   context: async () => {},
  //   introspection: true,
  // });
  const server = new ApolloServer({
    schema: buildSubgraphSchema([
      {
        typeDefs: gql`
          ${typeDefs}
        `,
        resolvers: resolvers as { Query: {} },
        // cors: corsOptions,
        // context: async () => {},
        // introspection: true,
      },
    ]),
  });

  const PORT = process.env.PORT || 4000;
  server.applyMiddleware({ app, cors: corsOptions });
  // To serve up the playground in :4000/graphql
  app.listen(PORT, () => {
    log(`🚀 Server ready at ${PORT}`);
  });

  try {
    console.log("Registering schema", typeDefs.toString());

    const r = await fetch("http://localhost:6001/schema/push", {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        name: `example_${PORT}`, // service name
        version: "latest", //service version, like docker container hash. Use 'latest' for dev env
        type_defs: typeDefs.toString(),
        url: `http://rob.local:${PORT}`,
      }),
    });
    console.log(r);
    console.info("Schema registered successfully!");
  } catch (err) {
    console.error(`Schema registration failed: ${err.message}`);
  }
})();
