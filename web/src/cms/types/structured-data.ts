export type JsonLdPrimitive = string | number | boolean | null;

export type JsonLdValue = JsonLdPrimitive | JsonLdObject | JsonLdValue[];

export type JsonLdObject = {
  [key: string]: JsonLdValue;
};

export type BreadcrumbItem = {
  name: string;
  url: string;
};
