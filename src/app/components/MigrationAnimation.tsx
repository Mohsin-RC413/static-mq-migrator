'use client';

import {
  ArrowRight,
  CheckCircle2,
  Database,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';

const features = [
  { label: 'Zero Downtime', icon: ShieldCheck },

  { label: 'Auto Validation', icon: Sparkles },
  { label: 'Rollback Ready', icon: RotateCcw },
];

export function MigrationAnimation() {
  return (
    <div className="h-full bg-gradient-to-br from-black via-neutral-950 to-neutral-900 flex items-center justify-center p-12 font-['Roboto']">
      <div className="max-w-2xl w-full">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-100 mb-4">
            Seamless IBM MQ Migration
          </h2>
          <p className="text-gray-300 text-lg">
            Migrate your IBM MQ with zero downtime
          </p>
        </motion.div>

        {/* Animation Container */}
        <div className="relative flex items-center justify-between">
          {/* Source Queue */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-neutral-700/80 rounded-2xl p-8 shadow-2xl border border-neutral-500/60 backdrop-blur">
              <Server className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="font-bold text-gray-100 mb-2">Source</h3>
              <p className="text-sm text-gray-400">Legacy Environment</p>
              
              {/* Messages */}
              <div className="mt-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: 0.5 + i * 0.2,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                    className="h-2 bg-gray-400 rounded-full"
                    style={{ width: `${100 - i * 15}%` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Migration Arrow with Messages */}
          <div className="relative flex-1 flex items-center justify-center px-8">
            {/* Main Arrow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <ArrowRight className="w-24 h-24 text-gray-200" strokeWidth={2.5} />
            </motion.div>

            {/* Animated Messages Flying Across */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ x: -100, opacity: 0 }}
                animate={{ 
                  x: 100, 
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.7 + 1,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                  ease: "easeInOut"
                }}
                className="absolute left-1/2 top-1/2 -translate-y-1/2"
                style={{ top: `${50 + (i - 1) * 15}%` }}
              >
                <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-200 rounded-lg shadow-lg" />
              </motion.div>
            ))}

            {/* Progress Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-neutral-700/80 px-4 py-2 rounded-full shadow-lg border border-neutral-500/60 backdrop-blur"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-gray-200 border-t-transparent rounded-full"
                />
                <span className="text-sm font-medium text-gray-100">Migrating...</span>
              </div>
            </motion.div>
          </div>

          {/* Destination Queue */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="bg-neutral-700/80 rounded-2xl p-8 shadow-2xl border border-neutral-500/60 backdrop-blur">
              <Database className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="font-bold text-gray-100 mb-2">Target</h3>
              <p className="text-sm text-gray-400">New Environment</p>
              
              {/* Success Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 2 }}
                className="mt-4 flex items-center gap-2 text-gray-200"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Ready</span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-16 grid grid-cols-3 gap-6 text-center"
        >
          {features.map(({ label, icon: Icon }) => (
            <motion.div
              key={label}
              whileHover={{ scale: 1.05 }}
              className="bg-neutral-700/70 border border-neutral-500/50 rounded-lg p-4 shadow-md backdrop-blur"
            >
              <Icon className="w-8 h-8 text-gray-200 mb-2" />
              <p className="text-sm font-medium text-gray-100">{label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
