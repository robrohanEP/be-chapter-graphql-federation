# Example gqlgen based service

This is an example service that exposes a very simple schema:

    type Foo {
        id: ID!
        gqlgen: Boolean!
    }

Other example services will add other fields to the `Foo` object.
