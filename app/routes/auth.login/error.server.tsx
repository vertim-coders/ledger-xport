import type { LoginError } from "@shopify/shopify-app-remix/server";
import { LoginErrorType } from "@shopify/shopify-app-remix/server";
import type { LoginErrorMessage } from "../../types/LoginErrorMessageType";

export function loginErrorMessage(loginErrors: LoginError): LoginErrorMessage {
  if (loginErrors?.shop === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if (loginErrors?.shop === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }

  return {};
}
