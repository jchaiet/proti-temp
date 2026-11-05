import { PortableText, type PortableTextComponents } from "@portabletext/react";

import type { PortableTextBlock } from "@portabletext/types";

import styles from "./styles.module.css";

interface Props {
  value?: PortableTextBlock[];

  mode?: "inline" | "block";
}

const marks: PortableTextComponents["marks"] = {
  textStyle: ({ children, value }) => {
    const color = value?.color ?? "default";

    const size = value?.size ?? "inherit";

    return (
      <span className={styles.textStyle} data-color={color} data-size={size}>
        {children}
      </span>
    );
  },
};

const blockComponents: PortableTextComponents = {
  marks,

  block: {
    normal: ({ children }) => <p>{children}</p>,
  },

  list: {
    bullet: ({ children }) => <ul>{children}</ul>,

    number: ({ children }) => <ol>{children}</ol>,
  },

  listItem: {
    bullet: ({ children }) => <li>{children}</li>,

    number: ({ children }) => <li>{children}</li>,
  },
};

const inlineComponents: PortableTextComponents = {
  marks,

  block: {
    normal: ({ children }) => <>{children}</>,
  },
};

export function CmsRichText({ value, mode = "block" }: Props) {
  if (!value?.length) {
    return null;
  }

  return (
    <PortableText
      value={value}
      components={mode === "inline" ? inlineComponents : blockComponents}
    />
  );
}
