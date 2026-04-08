import { motion, useMotionValue } from "framer-motion";
import { useEffect, useState } from "react";

type Direction = "left" | "right";

function getRandomNumberInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function Photo({
  src, alt, direction, width, height, className,
}: {
  src: string; alt: string; direction?: Direction; width: number; height: number; className?: string;
}) {
  const [rotation, setRotation] = useState(0);
  const x = useMotionValue(200);
  const y = useMotionValue(200);

  useEffect(() => {
    setRotation(getRandomNumberInRange(1, 4) * (direction === "left" ? -1 : 1));
  }, []);

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      whileTap={{ scale: 1.2, zIndex: 9999 }}
      whileHover={{ scale: 1.1, rotateZ: 2 * (direction === "left" ? -1 : 1), zIndex: 9999 }}
      whileDrag={{ scale: 1.1, zIndex: 9999 }}
      initial={{ rotate: 0 }}
      animate={{ rotate: rotation }}
      style={{
        width, height, perspective: 400,
        zIndex: 1,
        WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", touchAction: "none",
      }}
      className={`relative mx-auto shrink-0 cursor-grab active:cursor-grabbing ${className || ""}`}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left);
        y.set(e.clientY - rect.top);
      }}
      onMouseLeave={() => { x.set(200); y.set(200); }}
      draggable={false}
      tabIndex={0}
    >
      <div className="relative h-full w-full overflow-hidden rounded-lg shadow-sm shadow-slate-900/30">
        <img className="rounded-lg object-cover h-full w-full" src={src} alt={alt} draggable={false} />
      </div>
    </motion.div>
  );
}
