import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

export default function SplashScreen({ onComplete }) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false)
        }, 2500)
        return () => clearTimeout(timer)
    }, [])

    return (
        <AnimatePresence onExitComplete={onComplete}>
            {visible && (
                <motion.div
                    key="splash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                        enter: { duration: 0.3 },
                        exit: { duration: 0.5 }
                    }}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        backgroundImage: "url('/splash-bg.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center center",
                        backgroundRepeat: "no-repeat",
                        backgroundColor: "#9B1B4B"
                    }}
                />
            )}
        </AnimatePresence>
    )
}
