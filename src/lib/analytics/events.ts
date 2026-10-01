/** Site code written into every ANALYTICS line, plus the allowed event names. */
export const ANALYTICS_SITE = "photosizekaro";

/** Events the browser may send to /api/t. Anything else is dropped. */
export const CLIENT_EVENTS = [
  "pageview",
  "preset_select",
  "process_photo",
  "process_signature",
  "download",
  "kit_view",
  "checkout_open",
] as const;
export type ClientEvent = (typeof CLIENT_EVENTS)[number];

/** Events only the server writes (after verification). */
export type ServerEvent = "order_created" | "payment_success" | "restore";
