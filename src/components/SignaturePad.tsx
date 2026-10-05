import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function SignaturePad({
  value,
  onChange,
  label = "Signature",
}: {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#57d3ff";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
      setHasInk(true);
    }
  }, [value]);

  function pos(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="rule-label">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasInk(false);
            onChange(null);
          }}
        >
          Clear
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={520}
        height={140}
        className="h-[140px] w-full touch-none rounded-sm border border-dashed border-border bg-background"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const ctx = event.currentTarget.getContext("2d");
          if (!ctx) return;
          drawing.current = true;
          const p = pos(event);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const ctx = event.currentTarget.getContext("2d");
          if (!ctx) return;
          const p = pos(event);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          setHasInk(true);
        }}
        onPointerUp={(event) => {
          drawing.current = false;
          onChange(event.currentTarget.toDataURL("image/png"));
        }}
      />
      <p className="text-xs text-muted-foreground">
        {hasInk ? "Signature captured." : "Sign above with mouse, stylus or finger."}
      </p>
    </div>
  );
}
