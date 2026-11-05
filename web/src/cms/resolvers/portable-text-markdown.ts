import type {
  ArbitraryTypedObject,
  PortableTextBlock,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from "@portabletext/types";

export type PortableTextValue = PortableTextBlock[] | null | undefined;

type LinkMarkDefinition = PortableTextMarkDefinition & {
  href?: string;
  url?: string;
};

function isPortableTextSpan(
  value: ArbitraryTypedObject | PortableTextSpan,
): value is PortableTextSpan {
  return value._type === "span";
}

function getMarkDef(
  mark: string,
  markDefs: PortableTextMarkDefinition[],
): PortableTextMarkDefinition | undefined {
  return markDefs.find((markDef) => markDef._key === mark);
}

function serializeSpan(
  span: PortableTextSpan,
  markDefs: PortableTextMarkDefinition[],
): string {
  let output = span.text ?? "";

  for (const mark of span.marks ?? []) {
    switch (mark) {
      case "strong":
        output = `**${output}**`;
        continue;

      case "em":
        output = `*${output}*`;
        continue;

      case "code":
        output = `\`${output}\``;
        continue;

      case "strike-through":
      case "strike":
        output = `~~${output}~~`;
        continue;

      default:
        break;
    }

    const markDef = getMarkDef(mark, markDefs) as
      | LinkMarkDefinition
      | undefined;

    const href = markDef?.href ?? markDef?.url;

    if (href) {
      output = `[${output}](${href})`;
    }
  }

  return output;
}

function serializeBlockText(block: PortableTextBlock): string {
  const markDefs = block.markDefs ?? [];

  return (block.children ?? [])
    .filter(isPortableTextSpan)
    .map((span) => serializeSpan(span, markDefs))
    .join("");
}

function serializeStyledBlock(
  block: PortableTextBlock,
  content: string,
): string {
  switch (block.style) {
    case "h1":
      return `# ${content}`;

    case "h2":
      return `## ${content}`;

    case "h3":
      return `### ${content}`;

    case "h4":
      return `#### ${content}`;

    case "h5":
      return `##### ${content}`;

    case "h6":
      return `###### ${content}`;

    case "blockquote":
      return content
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");

    default:
      return content;
  }
}

export function portableTextToMarkdown(value: PortableTextValue): string {
  if (!Array.isArray(value)) {
    return "";
  }

  const output: string[] = [];

  let previousWasList = false;

  for (const block of value) {
    const content = serializeBlockText(block);

    if (!content) {
      continue;
    }

    if (block.listItem) {
      const level = Math.max(1, block.level ?? 1);

      const indent = "  ".repeat(level - 1);

      /*
       * Portable Text intentionally allows custom list item
       * names in addition to "bullet" and "number".
       *
       * Markdown only has unordered/ordered list syntax, so
       * "number" maps to an ordered list and any other list
       * style falls back to an unordered list.
       */
      const marker = block.listItem === "number" ? "1." : "-";

      output.push(`${indent}${marker} ${content}`);

      previousWasList = true;
      continue;
    }

    if (previousWasList && output.length > 0) {
      output.push("");
    }

    output.push(serializeStyledBlock(block, content));

    output.push("");

    previousWasList = false;
  }

  return output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function portableTextToPlainText(value: PortableTextValue): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((block) => serializeBlockText(block))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
