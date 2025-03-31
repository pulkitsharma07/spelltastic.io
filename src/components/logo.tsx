import Link from "next/link";
import { Kalam } from "next/font/google";
import Image from "next/image";

const kalam = Kalam({ subsets: ["latin"], weight: "700" });

interface LogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ href = "/", size = "md" }: LogoProps) {
  const textSize = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];

  const imageSize = {
    sm: 24,
    md: 32,
    lg: 40,
  }[size];

  return (
    <Link href={href} className="flex items-center gap-2">
      <div className="relative">
        <Image
          src="/logo.png"
          alt="Spelltastic Logo"
          width={imageSize}
          height={imageSize}
          className="object-contain"
        />
      </div>
      <span
        className={`${textSize} pt-1 font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent tracking-tight ${kalam.className}`}
      >
        Spelltastic.io
      </span>
      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/10 text-yellow-400 rounded-md uppercase tracking-wider border border-yellow-400/20">
        Open-Core
      </span>
    </Link>
  );
}
