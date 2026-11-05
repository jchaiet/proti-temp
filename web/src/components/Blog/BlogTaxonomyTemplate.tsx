import { CARD_IMAGE_PRESET_SIZE } from "@/cms/resolvers/image-presets";
import type {
  DocumentItem,
  FilterOption,
  SortOption,
} from "mino-ui/blocks/DocumentListBlock";

import type { MappedDocumentListBlock } from "@/cms/mappers/blocks";
import type {
  BlogTaxonomyListItem,
  BlogTaxonomyPage,
} from "@/cms/resolvers/blog-taxonomy";

import { DocumentList } from "@/components/BlockRenderer/DocumentList";

export interface BlogTaxonomyTemplateProps {
  page: BlogTaxonomyPage;

  localePrefix?: string;
}

function normalizePrefix(prefix?: string): string {
  if (!prefix) {
    return "";
  }

  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;

  return normalized.replace(/\/+$/, "");
}

function getBlogHref(slug: string, localePrefix?: string): string {
  const prefix = normalizePrefix(localePrefix);

  return `${prefix}/blog/${slug}`;
}

function mapBlogDocument(
  blog: BlogTaxonomyListItem,
  localePrefix?: string,
): DocumentItem {
  return {
    id: blog._id,

    contentType: "blog",

    cardType: "article",

    title: blog.title,

    summary: blog.summary,

    url: getBlogHref(blog.slug, localePrefix),

    date: blog.publishedAt,

    thumbnail: blog.imageUrl,
    ...(blog.imageUrl
      ? {
          thumbnailWidth: CARD_IMAGE_PRESET_SIZE.width,
          thumbnailHeight: CARD_IMAGE_PRESET_SIZE.height,
        }
      : {}),
    ...(blog.imageUrl && blog.imageAlt ? { thumbnailAlt: blog.imageAlt } : {}),

    tags: blog.taxonomy?.map((term) => term.title).filter(Boolean) ?? [],
  };
}

function getFilterOptions(page: BlogTaxonomyPage): FilterOption[] {
  const terms = new Map<string, string>();

  for (const blog of page.blogs) {
    for (const term of blog.taxonomy ?? []) {
      if (term._id === page.taxonomy._id || !term.title) {
        continue;
      }

      const normalizedTitle = term.title.trim().toLowerCase();

      if (!normalizedTitle) {
        continue;
      }

      if (!terms.has(normalizedTitle)) {
        terms.set(normalizedTitle, term.title);
      }
    }
  }

  const options = Array.from(terms.entries())
    .sort(([, firstLabel], [, secondLabel]) =>
      firstLabel.localeCompare(secondLabel, undefined, {
        sensitivity: "base",
      }),
    )
    .map(([normalizedValue, label]) => ({
      label,
      value: normalizedValue,
    }));

  if (options.length === 0) {
    return [];
  }

  return [
    {
      label: "All",
      value: "all",
    },
    ...options,
  ];
}

const SORT_OPTIONS: SortOption[] = [
  {
    label: "Newest First",
    value: "newest",
  },
  {
    label: "Oldest First",
    value: "oldest",
  },
  {
    label: "Title A–Z",
    value: "title-asc",
  },
  {
    label: "Title Z–A",
    value: "title-desc",
  },
];

export function BlogTaxonomyTemplate({
  page,
  localePrefix,
}: BlogTaxonomyTemplateProps) {
  const documents = page.blogs.map((blog) =>
    mapBlogDocument(blog, localePrefix),
  );

  const filterOptions = getFilterOptions(page);

  const mapped: MappedDocumentListBlock = {
    sourceMode: "manual",

    props: {
      eyebrow: "Blog",
      title: page.taxonomy.title,
      headingProps: {
        level: 1,
      },
      description: page.taxonomy.description,
      documents,
      alignment: "left",
      gridCols: 3,
      filterOptions,
      filterTitle: "Refine",
      filterLogic: "radio",
      sortOptions: SORT_OPTIONS,
      searchPlaceholder: `Search ${page.taxonomy.title.toLowerCase()} blog posts...`,
      emptyStateText: `No blog posts found for ${page.taxonomy.title}.`,
    },

    enableSearch: true,

    enableSorting: true,

    enablePagination: true,

    itemsPerPage: 9,
  };

  return <DocumentList {...mapped} />;
}
