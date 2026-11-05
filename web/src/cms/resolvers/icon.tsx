import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Info,
  Mail,
  Phone,
  Play,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  MdArrowBack,
  MdArrowForward,
  MdCalendarToday,
  MdCheck,
  MdDownload,
  MdEmail,
  MdInfo,
  MdOpenInNew,
  MdPhone,
  MdPlayArrow,
  MdSearch,
} from "react-icons/md";

import type { CmsIcon } from "@/cms/types";

/**
 * Keep this list aligned with Studio's ICON_OPTIONS in studio/lib/icons.tsx.
 * An unrecognized icon must not break navigation or other CMS-driven UI.
 */
export function resolveIcon(icon?: CmsIcon) {
  switch (icon) {
    case "lucide:arrow-right":
      return <ArrowRight size="1em" />;

    case "lucide:arrow-left":
      return <ArrowLeft size="1em" />;

    case "lucide:arrow-up-right":
      return <ArrowUpRight size="1em" />;

    case "lucide:chevron-right":
      return <ChevronRight size="1em" />;

    case "lucide:chevron-left":
      return <ChevronLeft size="1em" />;

    case "lucide:download":
      return <Download size="1em" />;

    case "lucide:external-link":
      return <ExternalLink size="1em" />;

    case "lucide:mail":
      return <Mail size="1em" />;

    case "lucide:phone":
      return <Phone size="1em" />;

    case "lucide:plus":
      return <Plus size="1em" />;

    case "lucide:search":
      return <Search size="1em" />;

    case "lucide:calendar":
      return <Calendar size="1em" />;

    case "lucide:play":
      return <Play size="1em" />;

    case "lucide:check":
      return <Check size="1em" />;

    case "lucide:x":
      return <X size="1em" />;

    case "lucide:info":
      return <Info size="1em" />;

    case "material:arrow-right":
      return <MdArrowForward size="1em" />;

    case "material:arrow-left":
      return <MdArrowBack size="1em" />;

    case "material:download":
      return <MdDownload size="1em" />;

    case "material:external-link":
      return <MdOpenInNew size="1em" />;

    case "material:mail":
      return <MdEmail size="1em" />;

    case "material:phone":
      return <MdPhone size="1em" />;

    case "material:search":
      return <MdSearch size="1em" />;

    case "material:calendar":
      return <MdCalendarToday size="1em" />;

    case "material:play":
      return <MdPlayArrow size="1em" />;

    case "material:check":
      return <MdCheck size="1em" />;

    case "material:info":
      return <MdInfo size="1em" />;

    default:
      return undefined;
  }
}
