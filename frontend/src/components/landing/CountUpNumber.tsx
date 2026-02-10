import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface CountUpNumberProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  delay?: number;
  decimals?: number;
  className?: string;
}

const CountUpNumber = ({
  end,
  suffix = "",
  prefix = "",
  duration = 2000,
  delay = 0,
  decimals = 0,
  className,
}: CountUpNumberProps) => {
  const { formattedCount, ref, isVisible } = useCountUp({
    end,
    suffix,
    prefix,
    duration,
    delay,
    decimals,
  });

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
        className
      )}
    >
      {formattedCount}
    </div>
  );
};

export default CountUpNumber;
