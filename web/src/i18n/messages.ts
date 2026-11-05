import { enUsMessages } from "./en-us";
import { esUsMessages } from "./es-us";

import type { AppMessages } from "./types";

const messagesByLocale: Record<string, AppMessages> = {
  "en-us": enUsMessages,
  "es-us": esUsMessages,
};

export function getAppMessages(locale: string): AppMessages {
  const normalized = locale.trim().toLowerCase();

  const exact = messagesByLocale[normalized];

  if (exact) {
    return exact;
  }

  const language = normalized.split("-")[0];

  if (language === "es") {
    return esUsMessages;
  }

  return enUsMessages;
}
