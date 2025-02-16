import { AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface ErrorAlertProps {
    message: string
}

export function ErrorAlert({ message }: ErrorAlertProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-50 border-l-4 border-rose-500 p-4"
        >
            <div className="flex">
                <AlertCircle className="h-5 w-5 text-rose-400" />
                <p className="ml-3 text-sm text-rose-700">{message}</p>
            </div>
        </motion.div>
    )
}