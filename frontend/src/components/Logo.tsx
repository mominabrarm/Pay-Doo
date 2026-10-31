import type { ImgHTMLAttributes } from "react";
import paydooLogo from "../assets/logo/paydoo-logo.png";
import paydooLogoDark from "../assets/logo/paydoo-logo-dark.png";

export interface LogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  height?: number | string;
  onDark?: boolean;
  variant?: "default" | "dark";
  alt?: string;
  className?: string;
}

export function Logo({
  height = 36,
  onDark = false,
  variant,
  alt = "PayDoo",
  className = "",
  style,
  ...rest
}: LogoProps) {
  const pixelHeight = typeof height === "number" ? `${height}px` : height;

  if (variant === "dark") {
    return (
      <img
        src={paydooLogoDark}
        alt={alt}
        className={className}
        style={{ height: pixelHeight, width: "auto", display: "inline-block", ...style }}
        {...rest}
      />
    );
  }

  if (onDark) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-white rounded-lg px-2.5 py-1 shadow-xs ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "4px 8px",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }}
      >
        <img
          src={paydooLogo}
          alt={alt}
          style={{ height: pixelHeight, width: "auto", display: "block", ...style }}
          {...rest}
        />
      </span>
    );
  }

  return (
    <img
      src={paydooLogo}
      alt={alt}
      className={className}
      style={{ height: pixelHeight, width: "auto", display: "inline-block", ...style }}
      {...rest}
    />
  );
}

export default Logo;
