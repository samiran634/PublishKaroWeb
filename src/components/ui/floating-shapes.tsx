import { motion } from 'framer-motion';

const shapes = [
    { type: 'circle', size: 60, x: '10%', y: '20%', duration: 25, delay: 0 },
    { type: 'square', size: 40, x: '85%', y: '15%', duration: 30, delay: 2 },
    { type: 'circle', size: 80, x: '75%', y: '70%', duration: 28, delay: 4 },
    { type: 'triangle', size: 50, x: '20%', y: '80%', duration: 32, delay: 1 },
    { type: 'square', size: 35, x: '50%', y: '10%', duration: 27, delay: 3 },
    { type: 'circle', size: 45, x: '90%', y: '50%', duration: 29, delay: 5 },
];

export function FloatingShapes() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
            {shapes.map((shape, index) => (
                <motion.div
                    key={index}
                    className="absolute"
                    style={{
                        left: shape.x,
                        top: shape.y,
                        width: shape.size,
                        height: shape.size,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        x: [0, 15, 0],
                        rotate: shape.type === 'square' ? [0, 90, 0] : [0, 360, 0],
                    }}
                    transition={{
                        duration: shape.duration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: shape.delay,
                    }}
                >
                    {shape.type === 'circle' && (
                        <div className="w-full h-full rounded-full bg-muted/10 dark:bg-muted/5" />
                    )}
                    {shape.type === 'square' && (
                        <div className="w-full h-full bg-muted/10 dark:bg-muted/5" />
                    )}
                    {shape.type === 'triangle' && (
                        <div
                            className="w-full h-full bg-muted/10 dark:bg-muted/5"
                            style={{
                                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                            }}
                        />
                    )}
                </motion.div>
            ))}
        </div>
    );
}
