import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

export default function SplashScreen({ onComplete }) {
    const [visible, setVisible] = useState(true)
    const [isMobile, setIsMobile] = useState(
        typeof window !== "undefined" ? window.innerWidth < 768 : false
    )

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false)
        }, 2500)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
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
                        // Mobile screens are much taller/narrower than this image's
                        // aspect ratio, so "cover" crops off large portions of it.
                        // "contain" shows the full image with no cropping instead.
                        backgroundSize: isMobile ? "contain" : "cover",
                        backgroundPosition: "center center",
                        backgroundRepeat: "no-repeat",
                        backgroundColor: "#9B1B4B"
                    }}
                />
            )}
        </AnimatePresence>
    )
}