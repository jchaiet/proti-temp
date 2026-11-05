import styles from "./styles.module.css";

export interface ErrorStateProps {
  code?: string;
  title: string;
  message: string;

  homeHref?: string;
  homeLabel?: string;

  retryLabel?: string;
  onRetry?: () => void;

  reference?: string;
}

export function ErrorState({
  code,
  title,
  message,

  homeHref = "/",
  homeLabel = "Return home",

  retryLabel = "Try again",
  onRetry,

  reference,
}: ErrorStateProps) {
  return (
    <main
      className={styles.errorState}
      role={code === "404" ? undefined : "alert"}
    >
      <div className={styles.container}>
        {code && <p className={styles.code}>{code}</p>}

        <h1 className={styles.title}>{title}</h1>

        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          {onRetry && (
            <button
              type="button"
              className={styles.primaryAction}
              onClick={onRetry}
            >
              {retryLabel}
            </button>
          )}

          <a
            className={onRetry ? styles.secondaryAction : styles.primaryAction}
            href={homeHref}
          >
            {homeLabel}
          </a>
        </div>

        {reference && (
          <p className={styles.reference}>Reference: {reference}</p>
        )}
      </div>
    </main>
  );
}
