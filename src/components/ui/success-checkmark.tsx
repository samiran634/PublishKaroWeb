import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface SuccessCheckmarkProps {
  size?: number;
}

export function SuccessCheckmark({ size = 24 }: SuccessCheckmarkProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
      }}
      className="inline-flex items-center justify-center rounded-full bg-green-500 text-white"
      style={{ width: size, height: size }}
    >
      <Check size={size * 0.6} strokeWidth={3} />
    </motion.div>
  );
}
