
* Look at configured endpoints: http://localhost:8083/admin
* GraphQL query UI: http://localhost:8082/playground

Example query:

```gql
query{
  traits {
    id
    portal
    label
    category {
      id
      text
    }
  }
}
```

Add to headers to see query plan, etc:

```json
{
  "X-Bramble-Debug": "all"
}
```