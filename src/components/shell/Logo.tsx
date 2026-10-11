import Image from "next/image";

// The supplied Hydris mark (white on black, public/logo.png) as a rounded tile, with the wordmark beside it.
// The tile reads on both the white nav bar and the blue footer, so there is no colour prop.
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return <Image src="/logo.png" alt="" width={72} height={72} priority className={`${className} rounded-[10px]`} />;
}

// The wordmark takes the surrounding text colour.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[22px] font-bold tracking-[-0.02em]">Hydris</span>
    </span>
  );
}
