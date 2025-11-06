"use client";
import { useEffect, useRef, useState } from "react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function BackgroundGradientAnimation({
  gradientBackgroundStart = "rgb(255,255,255)",
  gradientBackgroundEnd = "rgb(229,229,229)",
  firstColor = "255, 0, 0",
  secondColor = "180, 0, 0",
  thirdColor = "210, 0, 0",
  fourthColor = "255, 100, 100",
  fifthColor = "255, 150, 150",
  pointerColor = "255, 50, 50",
  size = "80%",
  blendingValue = "hard-light",
  children,
  className,
  interactive = true,
  containerClassName,
}) {
  const interactiveRef = useRef(null);

  const [curX, setCurX] = useState(0);
  const [curY, setCurY] = useState(0);
  const [tgX, setTgX] = useState(0);
  const [tgY, setTgY] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body.style;
    body.setProperty("--gradient-background-start", gradientBackgroundStart);
    body.setProperty("--gradient-background-end", gradientBackgroundEnd);
    body.setProperty("--first-color", firstColor);
    body.setProperty("--second-color", secondColor);
    body.setProperty("--third-color", thirdColor);
    body.setProperty("--fourth-color", fourthColor);
    body.setProperty("--fifth-color", fifthColor);
    body.setProperty("--pointer-color", pointerColor);
    body.setProperty("--size", size);
    body.setProperty("--blending-value", blendingValue);
  }, [
    gradientBackgroundStart,
    gradientBackgroundEnd,
    firstColor,
    secondColor,
    thirdColor,
    fourthColor,
    fifthColor,
    pointerColor,
    size,
    blendingValue,
  ]);

  useEffect(() => {
    function move() {
      if (!interactiveRef.current) return;
      setCurX((prev) => prev + (tgX - prev) / 20);
      setCurY((prev) => prev + (tgY - prev) / 20);
      interactiveRef.current.style.transform = `translate(${Math.round(
        curX
      )}px, ${Math.round(curY)}px)`;
    }
    move();
  }, [tgX, tgY, curX, curY]);

  const handleMouseMove = (event) => {
    if (!interactiveRef.current) return;
    const rect = interactiveRef.current.getBoundingClientRect();
    setTgX(event.clientX - rect.left);
    setTgY(event.clientY - rect.top);
  };

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
    }
  }, []);

  return (
    <div
      className={cn(
        "relative h-screen w-screen overflow-hidden bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]",
        containerClassName
      )}
    >
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className={cn("relative z-10", className)}>{children}</div>

      <div
        onMouseMove={interactive ? handleMouseMove : undefined}
        className={cn(
          "gradients-container absolute inset-0 blur-lg",
          isSafari ? "blur-2xl" : "[filter:url(#blurMe)_blur(40px)]"
        )}
      >
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_var(--first-color)_0,_var(--first-color)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:center_center]`,
            `animate-first`
          )}
        />
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--second-color),_0.8)_0,_rgba(var(--second-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-400px)]`,
            `animate-second`
          )}
        />
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--third-color),_0.8)_0,_rgba(var(--third-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%+400px)]`,
            `animate-third`
          )}
        />
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fourth-color),_0.8)_0,_rgba(var(--fourth-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-200px)]`,
            `animate-fourth`
          )}
        />
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fifth-color),_0.8)_0,_rgba(var(--fifth-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-800px)_calc(50%+800px)]`,
            `animate-fifth`
          )}
        />

        {interactive && (
          <div
            ref={interactiveRef}
            className={cn(
              `absolute [background:radial-gradient(circle_at_center,_rgba(var(--pointer-color),_0.8)_0,_rgba(var(--pointer-color),_0)_50%)_no-repeat]`,
              `[mix-blend-mode:var(--blending-value)] w-full h-full -top-1/2 -left-1/2`,
              `opacity-70`
            )}
          />
        )}
      </div>
    </div>
  );
}
