import { motion } from "framer-motion";

function ShadowBox({ width, height }: { width: number; height: number }) {
  return (
    <div className="group inline-block text-center">
      <div
        className="rounded-[20px] border border-border-primary p-2"
        style={{ width, height }}
      >
        <div
          className="grid h-full place-items-center rounded-xl border-2 border-[#A5AEB81F]/10 bg-[#EDEEF0]"
          style={{ boxShadow: "0px 2px 1.5px 0px #A5AEB852 inset" }}
        ></div>
      </div>
    </div>
  );
}

interface Props {
  delay: number;
}

export function AnimatedMobilePhotos({ delay }: Props) {
  return (
    <div className="relative -mx-12 lg:hidden">
      <div className="relative w-full overflow-hidden py-12">
        <div className="flex items-center justify-center space-x-14">
          <motion.div
            className="relative w-fit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay }}
          >
            <ShadowBox width={170} height={252} />
            <img
              className="absolute left-0 top-2 h-[245px] w-[163px] rotate-[-5deg] rounded-lg object-cover"
              src="/kostas_speaking.jpg"
              alt="Kostas presenting at a conference"
            />
          </motion.div>
          <motion.div
            className="relative w-fit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: delay + 0.1 }}
          >
            <ShadowBox width={188} height={278} />
            <img
              className="absolute left-0 top-0 h-[280px] w-[190px] rotate-[-8deg] rounded-lg object-cover shadow-lg shadow-black/20"
              src="/kostas_neurips_square.jpg"
              alt="Kostas at a NeurIPS poster session"
            />
          </motion.div>
          <motion.div
            className="relative w-fit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: delay + 0.2 }}
          >
            <ShadowBox width={170} height={252} />
            <img
              className="absolute left-0 top-0 h-[245px] w-[163px] rotate-[10deg] rounded-lg object-cover shadow-lg shadow-black/20"
              src="/kostas_photo_2.jpg"
              alt="Portrait of Kostas"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
