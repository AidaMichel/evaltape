import {
  shopAdapter
} from "./adapters/shop";

const rawShopState = {
  capturedAt:
    Date.now(),

  orders: [
    {
      orderNumber:
        "ORD-1001",

      status:
        "paid",

      total:
        125,

      currency:
        "AED",

      customerEmail:
        "ramy@example.com"
    }
  ]
};

const normalized =
  shopAdapter.normalize(
    rawShopState
  );

console.log(
  "RAW PRODUCT STATE:"
);

console.dir(
  rawShopState,
  {
    depth: null
  }
);

console.log(
  "\nNORMALIZED EVALTAPE STATE:"
);

console.dir(
  normalized,
  {
    depth: null
  }
);
