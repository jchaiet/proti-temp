import type {ReactNode} from 'react'

import {
  LuArrowLeft,
  LuArrowRight,
  LuArrowUpRight,
  LuCalendar,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuDownload,
  LuExternalLink,
  LuInfo,
  LuMail,
  LuPhone,
  LuPlay,
  LuPlus,
  LuSearch,
  LuX,
} from 'react-icons/lu'

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
} from 'react-icons/md'

export interface IconOption {
  value: string
  label: string
  library: string
  icon: ReactNode
}

export const ICON_OPTIONS: IconOption[] = [
  {
    value: 'lucide:arrow-right',
    label: 'Arrow Right',
    library: 'Lucide',
    icon: <LuArrowRight />,
  },
  {
    value: 'lucide:arrow-left',
    label: 'Arrow Left',
    library: 'Lucide',
    icon: <LuArrowLeft />,
  },
  {
    value: 'lucide:arrow-up-right',
    label: 'Arrow Up Right',
    library: 'Lucide',
    icon: <LuArrowUpRight />,
  },
  {
    value: 'lucide:chevron-right',
    label: 'Chevron Right',
    library: 'Lucide',
    icon: <LuChevronRight />,
  },
  {
    value: 'lucide:chevron-left',
    label: 'Chevron Left',
    library: 'Lucide',
    icon: <LuChevronLeft />,
  },
  {
    value: 'lucide:download',
    label: 'Download',
    library: 'Lucide',
    icon: <LuDownload />,
  },
  {
    value: 'lucide:external-link',
    label: 'External Link',
    library: 'Lucide',
    icon: <LuExternalLink />,
  },
  {
    value: 'lucide:mail',
    label: 'Mail',
    library: 'Lucide',
    icon: <LuMail />,
  },
  {
    value: 'lucide:phone',
    label: 'Phone',
    library: 'Lucide',
    icon: <LuPhone />,
  },
  {
    value: 'lucide:plus',
    label: 'Plus',
    library: 'Lucide',
    icon: <LuPlus />,
  },
  {
    value: 'lucide:search',
    label: 'Search',
    library: 'Lucide',
    icon: <LuSearch />,
  },
  {
    value: 'lucide:calendar',
    label: 'Calendar',
    library: 'Lucide',
    icon: <LuCalendar />,
  },
  {
    value: 'lucide:play',
    label: 'Play',
    library: 'Lucide',
    icon: <LuPlay />,
  },
  {
    value: 'lucide:check',
    label: 'Check',
    library: 'Lucide',
    icon: <LuCheck />,
  },
  {
    value: 'lucide:x',
    label: 'Close',
    library: 'Lucide',
    icon: <LuX />,
  },
  {
    value: 'lucide:info',
    label: 'Info',
    library: 'Lucide',
    icon: <LuInfo />,
  },

  // Material

  {
    value: 'material:arrow-right',
    label: 'Arrow Right',
    library: 'Material',
    icon: <MdArrowForward />,
  },
  {
    value: 'material:arrow-left',
    label: 'Arrow Left',
    library: 'Material',
    icon: <MdArrowBack />,
  },
  {
    value: 'material:download',
    label: 'Download',
    library: 'Material',
    icon: <MdDownload />,
  },
  {
    value: 'material:external-link',
    label: 'External Link',
    library: 'Material',
    icon: <MdOpenInNew />,
  },
  {
    value: 'material:mail',
    label: 'Mail',
    library: 'Material',
    icon: <MdEmail />,
  },
  {
    value: 'material:phone',
    label: 'Phone',
    library: 'Material',
    icon: <MdPhone />,
  },
  {
    value: 'material:search',
    label: 'Search',
    library: 'Material',
    icon: <MdSearch />,
  },
  {
    value: 'material:calendar',
    label: 'Calendar',
    library: 'Material',
    icon: <MdCalendarToday />,
  },
  {
    value: 'material:play',
    label: 'Play',
    library: 'Material',
    icon: <MdPlayArrow />,
  },
  {
    value: 'material:check',
    label: 'Check',
    library: 'Material',
    icon: <MdCheck />,
  },
  {
    value: 'material:info',
    label: 'Info',
    library: 'Material',
    icon: <MdInfo />,
  },
]
