import Image from "next/image";

import type { MappedNavigationLogo } from "@/cms/mappers/navigation";

import styles from "./styles.module.css";

export interface SiteLogoProps {
  logo: MappedNavigationLogo;
  href: string;
  loading?: "eager" | "lazy";
}

export function SiteLogo({ logo, href, loading = "eager" }: SiteLogoProps) {
  const accessibleLabel = logo.alt || logo.text || "Home";

  return (
    <a
      href={href}
      className={styles.logoLink}
      aria-label={`${accessibleLabel} home`}
    >
      {logo.src ? (
        <Image
          src={logo.src}
          alt={logo.alt}
          width={180}
          height={40}
          className={styles.logoImage}
          loading={loading}
          unoptimized
        />
      ) : (
        <span className={styles.logoText}>{logo.text}</span>
      )}
    </a>
  );
}
