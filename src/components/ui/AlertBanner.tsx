interface AlertBannerProps {
  message: string;
  variant: "error" | "success";
  onDismiss: () => void;
}

export default function AlertBanner({ message, variant, onDismiss }: AlertBannerProps) {
  const styles =
    variant === "error"
      ? "border-red-800/50 bg-red-950/30 text-red-400"
      : "border-emerald-800/50 bg-emerald-950/30 text-emerald-400";

  const btnStyles =
    variant === "error"
      ? "text-red-500 hover:text-red-300"
      : "text-emerald-500 hover:text-emerald-300";

  return (
    <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {message}
      <button onClick={onDismiss} className={`ml-3 ${btnStyles}`}>
        ✕
      </button>
    </div>
  );
}
