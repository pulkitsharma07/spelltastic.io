"use client";

import { motion } from "framer-motion";

export default function LoadingStateSSE({ message }: { message: string }) {
  return (
    <div className="relative">
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full bg-blue-500/5 rounded-[40px] blur-3xl transform rotate-3" />
        <div className="w-full h-full bg-teal-500/5 rounded-[40px] blur-3xl transform -rotate-3" />
      </div>

      <div className="relative max-w-2xl mx-auto space-y-8 p-8">
        {/* Main Loading Section */}
        <div className="text-center space-y-6">
          {/* Animated Spinner */}
          <div className="relative mx-auto w-20 h-20">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-blue-400/20"></div>
            {/* Spinning inner ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-spin"></div>
            {/* Center dot */}
            <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 opacity-20 blur-sm"></div>
          </div>

          {/* Title with gradient */}
          <h2 className="text-3xl font-bold">
            <span className="block bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Reviewing Your Page
            </span>
            <span className="block mt-2 text-lg font-medium text-slate-400">
              Please don't close this tab, your report will open automatically
              once it's ready.
            </span>
          </h2>

          {/* Current Status Message */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-300 h-6 transition-all">{message}</p>
          </div>

          {/* Time Estimates */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 5 }}
            className="space-y-4"
          >
            {/* First Message */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              key="first-message"
              className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3"
            >
              <p className="text-sm font-medium text-blue-400">
                Please wait, it usually takes between 30 seconds to 1 minute to
                generate a report.
              </p>
            </motion.div>

            {/* Second Message (Delayed) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 50 }}
              key="second-message"
              className="bg-red-500/10 border border-red-400/20 rounded-lg p-3"
            >
              <p className="text-sm font-medium text-red-400">
                This is taking longer than expected, please hang tight, it
                should be ready soon.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
