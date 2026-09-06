import { cn } from '@/lib/utils';

interface GoogleIconProps {
  name: string;
  className?: string;
  size?: number;
}

export default function GoogleIcon({ name, className, size = 24 }: GoogleIconProps) {
  return (
    <span 
      className={cn("material-symbols-rounded select-none", className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}
