import { motion, useScroll } from "framer-motion";

export function ReadingProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[100] h-[2px] origin-left bg-purple-primary"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
