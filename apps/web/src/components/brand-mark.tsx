type BrandMarkProps = {
  variant?: "icon" | "horizontal";
};

export function BrandMark({ variant = "icon" }: BrandMarkProps) {
  const logo =
    variant === "horizontal"
      ? "/Primary%20black%20logo%20(Horizontal).png"
      : "/Black%20logo%2032x32.png";

  return (
    <div className={variant === "horizontal" ? "w-56" : "size-8 shrink-0"}>
      <img className="block h-auto w-full" src={logo} alt="Toggle Ctrl" />
    </div>
  );
}
