import { forwardRef, type ButtonHTMLAttributes, type PropsWithChildren } from "react";
import styles from "./Button.module.css";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "text";
  }
>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, variant = "primary", type = "button", ...props },
  ref,
) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button ref={ref} type={type} className={classes} {...props}>
      {children}
    </button>
  );
});
