import {
  z
} from "zod";

import type {
  ProductAdapter
} from "../adapter";

import type {
  EnvironmentSnapshot
} from "../types";

const RawShopOrderSchema =
  z.object({
    orderNumber:
      z.string(),

    status:
      z.string(),

    total:
      z.number(),

    currency:
      z.string(),

    customerEmail:
      z.string()
  });

const RawShopStateSchema =
  z.object({
    orders:
      z.array(
        RawShopOrderSchema
      ),

    capturedAt:
      z.number()
  });

export type RawShopOrder =
  z.infer<
    typeof RawShopOrderSchema
  >;

export type RawShopState =
  z.infer<
    typeof RawShopStateSchema
  >;

export const shopAdapter:
  ProductAdapter = {
    name:
      "shop",

    normalize(
      rawState: unknown
    ): EnvironmentSnapshot {
      const validated =
        RawShopStateSchema.parse(
          rawState
        );

      return {
        capturedAt:
          validated.capturedAt,

        entities:
          validated.orders.map(
            (order) => ({
              key:
                `order:${order.orderNumber}`,

              type:
                "order",

              id:
                order.orderNumber,

              data: {
                orderNumber:
                  order.orderNumber,

                status:
                  order.status,

                total:
                  order.total,

                currency:
                  order.currency,

                customerEmail:
                  order.customerEmail
              }
            })
          )
      };
    }
  };
