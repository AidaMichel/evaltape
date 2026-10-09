import {
  getAdapter,
  listAdapters
} from "./adapters/registry";

console.log(
  "AVAILABLE ADAPTERS:"
);

console.log(
  listAdapters()
);

const adapter =
  getAdapter(
    "shop"
  );

const normalized =
  adapter.normalize({
    capturedAt: 123,

    orders: [
      {
        orderNumber:
          "ORD-9000",

        status:
          "paid",

        total:
          999,

        currency:
          "AED",

        customerEmail:
          "test@example.com"
      }
    ]
  });

console.log(
  "\nRESOLVED ADAPTER:"
);

console.log(
  adapter.name
);

console.log(
  "\nNORMALIZED:"
);

console.dir(
  normalized,
  {
    depth: null
  }
);
