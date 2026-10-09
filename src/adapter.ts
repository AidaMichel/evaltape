import type {
  EnvironmentSnapshot
} from "./types";

export interface ProductAdapter {
  name: string;

  normalize(
    rawState: unknown
  ): EnvironmentSnapshot;
}
