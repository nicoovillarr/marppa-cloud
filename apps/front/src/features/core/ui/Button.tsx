"use client";

import { motion } from "framer-motion";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { PulseLoader } from "react-spinners";
import { GoCheckCircleFill } from "react-icons/go";
import { BiErrorAlt } from "react-icons/bi";
import { redirect } from "next/navigation";
import Link from "next/link";

export interface ButtonProps {
  className?: string;
  text?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: "primary" | "secondary" | "danger";
  href?: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  onClick?: (setProgress?: (progress: number) => void) => Promise<any> | any;
}

export interface ButtonRef {
  setIsLoading: (loading: boolean) => Promise<void>;
  setProgress: (progress: number) => void;
  setError: (error: string | boolean) => Promise<void>;
  cancel: () => void;
}

type ButtonState = "idle" | "loading" | "error" | "success";

const ButtonContent = ({
  icon,
  text,
}: {
  icon?: React.ReactNode;
  text: string;
}) => {
  return (
    <>
      {icon && (
        <span
          className={`pointer-events-none flex-shrink-0 ${!text ? "md:py-1" : ""
            }`}
        >
          {icon}
        </span>
      )}
      {text && (
        <label
          className={`pointer-events-none ${icon ? "hidden md:block" : "block"}`}
        >
          {text}
        </label>
      )}
    </>
  );
};

export const Button = forwardRef<ButtonRef, ButtonProps>(
  (
    {
      className,
      text,
      icon,
      disabled,
      type,
      style = "primary",
      href,
      target,
      onClick,
    },
    ref
  ) => {
    const [buttonStyle, setButtonStyle] = useState("");
    const [progress, setProgress] = useState(0);
    const [state, setState] = useState<ButtonState>("idle");

    useImperativeHandle(ref, () => ({
      setIsLoading: async (loading: boolean) => {
        if (loading) {
          setState("loading");
          setProgress(0);
          return;
        }

        if (state === "loading") {
          if (progress > 0) {
            setProgress(100);
          }
          setState("success");
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        setState("idle");
        setProgress(0);
      },
      setProgress: (progressValue: number) => {
        setProgress(progressValue);
      },
      setError: async (error: string | boolean) => {
        if (error) {
          setState("error");
          setProgress(0);

          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        setState("idle");
        setProgress(0);
      },
      cancel: () => {
        setState("idle");
        setProgress(0);
      },
    }));

    const buttonStyles = {
      primary: "border-none bg-accent text-white hover:brightness-95",
      secondary:
        "border-border bg-surface-raised text-ink hover:bg-surface-sunken",
      danger:
        "border-status-danger-tint bg-status-danger-tint text-status-danger hover:bg-status-danger hover:text-white",
    };

    const handleOnClick = async () => {
      if (state !== "idle" || disabled || !onClick) return;

      if (ref && "current" in ref) {
        await onClick();

        if (href) {
          if (target === "_blank") {
            window.open(href, "_blank");
          } else {
            redirect(href);
          }
        }

        return;
      }

      setProgress(0);
      setState("loading");

      try {
        await onClick(setProgress);
        setState("success");
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (href) {
          if (target === "_blank") {
            window.open(href, "_blank");
          } else {
            redirect(href);
          }
        }
      } catch (error) {
        console.error("Button click error:", error);
        setState("error");
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } finally {
        setState("idle");
      }
    };

    useEffect(() => {
      const classList = [
        "border relative flex shrink-0 items-center justify-center gap-2 rounded-md p-3 transition-colors overflow-hidden md:px-4 md:py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
      ];

      if (disabled) {
        classList.push(
          "border-border bg-surface-sunken text-ink-faint cursor-not-allowed pointer-events-none"
        );
        setButtonStyle(classList.join(" "));
        return;
      }

      if (state === "idle") {
        setProgress(0);
      }

      if (state === "loading") {
        classList.push("border-border bg-surface-sunken cursor-wait");
      } else if (state === "success") {
        classList.push("border-none bg-[#1f9d5c]");
      } else if (state === "error") {
        classList.push("border-none bg-[#d0393f] cursor-not-allowed");
      } else {
        classList.push(`${buttonStyles[style]} cursor-pointer`);
      }

      setButtonStyle(classList.join(" "));
    }, [state, disabled]);

    if (onClick || type === "submit") {
      return (
        <button
          className={`${buttonStyle} ${className}`}
          onClick={handleOnClick}
          type={type}
        >
          {/* Loading background animation */}
          <motion.div
            className="absolute inset-0 transition-transform duration-500 ease-in-out"
            initial={false}
            animate={{
              backgroundColor: state === "error" ? "#d0393f" : "#1f9d5c",
              width: `${progress}%`,
              opacity: state === "error" ? 0 : `${progress / 100}`,
            }}
          />

          {/* Loading spinner */}
          <motion.article
            className="absolute inset-0 z-10 flex items-center justify-center"
            initial={false}
            animate={{
              top: state === "loading" ? 0 : "200%",
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <PulseLoader color="var(--ink-muted)" size={4} />
          </motion.article>

          {/* Success icon */}
          <motion.article
            className="absolute inset-0 z-10 flex items-center justify-center"
            initial={false}
            animate={{
              top: state === "success" ? 0 : "-100%",
              opacity: state === "success" ? 1 : 0,
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <GoCheckCircleFill className="text-white" />
          </motion.article>

          {/* Error icon */}
          <motion.article
            className="absolute inset-0 z-10 flex items-center justify-center"
            initial={false}
            animate={{
              top: state === "error" ? 0 : "-100%",
              opacity: state === "error" ? 1 : 0,
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <BiErrorAlt className="text-white" />
          </motion.article>

          {/* Button content */}
          <motion.div
            className="z-10 flex items-center gap-1"
            initial={false}
            animate={{
              opacity: state === "idle" ? 1 : 0,
              y: state !== "idle" ? "-100%" : 0,
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <ButtonContent icon={icon} text={text} />
          </motion.div>
        </button>
      );
    }

    if (href) {
      return (
        <Link
          className={`${buttonStyle} ${className}`}
          href={href}
          target={target}
        >
          <ButtonContent icon={icon} text={text} />
        </Link>
      );
    }

    throw new Error("Button must have either onClick or href defined.");
  }
);

Button.displayName = "Button";
