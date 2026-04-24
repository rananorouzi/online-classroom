interface AvatarProps {
  name: string | null;
  email: string;
  size?: "sm" | "md";
}

export default function Avatar({ name, email, size = "sm" }: AvatarProps) {
  const initial = (name || email)[0].toUpperCase();
  const sizeClass =
    size === "md"
      ? "h-10 w-10 text-sm"
      : "h-8 w-8 text-xs";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold font-semibold ${sizeClass}`}
    >
      {initial}
    </div>
  );
}
