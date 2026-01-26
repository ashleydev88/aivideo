"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Shield, UserX, Building, Check, X, FileText, Zap, Brain, FilePenLine, Palette, AudioWaveform, Code2, Lock, Monitor, Users, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProcessVisualization from '../components/ProcessVisualization';

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const chartVariants = {
  hidden: { height: "10%" },
  visible: {
    height: "70%",
    transition: { duration: 1.5, ease: "easeInOut", delay: 0.5 }
  }
};

const useCases = [
  {
    id: 'cybersecurity',
    label: 'Cybersecurity Protocol',
    title: 'Phishing Defense Training',
    description: 'Visualize email headers and malicious URLs with pinpoint accuracy. Train employees to spot red flags instantly.',
    icon: Lock,
    color: 'bg-indigo-500',
    visual: (
      <div className="w-full h-full bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 relative overflow-hidden shadow-2xl border border-slate-700">
        <div className="flex items-center gap-2 border-b border-slate-700 pb-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-slate-500">inbox.exe</span>
        </div>
        <div className="space-y-2 opacity-80">
          <p><span className="text-purple-400">from:</span> <span className="text-red-400">admin@c0mpany.com</span></p>
          <p><span className="text-purple-400">subject:</span> Urgent Password Reset</p>
          <div className="mt-4 p-3 bg-slate-800 rounded border border-red-500/20 relative">
            <p className="text-slate-100">Click here to reset credentials...</p>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -right-1 -top-1 w-3 h-3 bg-red-500 rounded-full"
            />
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'harassment',
    label: 'Sexual Harassment Policy',
    title: 'Respectful Workplace Standards',
    description: 'Navigate complex social interactions without awkward enactments. Focus on clear boundaries and reporting procedures.',
    icon: Users,
    color: 'bg-rose-500',
    visual: (
      <div className="w-full h-full bg-white rounded-xl p-6 relative overflow-hidden shadow-2xl border border-slate-100 flex items-center justify-center">
        <div className="absolute inset-0 bg-rose-50/50"></div>
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-rose-600" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">Zero Tolerance</h4>
          <p className="text-slate-500 text-xs mt-2 max-w-[200px] mx-auto">Employees must report incidents immediately to HR.</p>
        </div>
      </div>
    )
  },
  {
    id: 'remote',
    label: 'Remote Work Guidelines',
    title: 'Distributed Team Best Practices',
    description: 'Standardize communication tools and hours across time zones using clear, animated timelines.',
    icon: Monitor,
    color: 'bg-sky-500',
    visual: (
      <div className="w-full h-full bg-slate-50 rounded-xl p-4 relative overflow-hidden shadow-2xl border border-slate-200">
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-white p-2 rounded shadow-sm">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-xs font-bold">NY</div>
            <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <motion.div className="h-full bg-sky-500 w-1/2" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
            </div>
            <span className="text-xs font-mono">09:00</span>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded shadow-sm opacity-60">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">LDN</div>
            <div className="h-2 flex-1 bg-slate-100 rounded-full"></div>
            <span className="text-xs font-mono">14:00</span>
          </div>
        </div>
      </div>
    )
  }
];

function UseCaseTabs() {
  const [activeTab, setActiveTab] = useState(useCases[0].id);
  const activeCase = useCases.find(c => c.id === activeTab) || useCases[0];

  return (
    <div className="flex flex-col lg:flex-row gap-12 items-start">
      {/* Tabs List */}
      <div className="w-full lg:w-1/3 flex flex-col gap-2">
        {useCases.map((useCase) => (
          <button
            key={useCase.id}
            onClick={() => setActiveTab(useCase.id)}
            className={`text-left px-6 py-4 rounded-xl transition-all duration-300 flex items-center gap-4 group ${activeTab === useCase.id
              ? 'bg-white shadow-lg ring-1 ring-teal-900/5 scale-105'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <div className={`p-2 rounded-lg transition-colors ${activeTab === useCase.id ? 'bg-teal-50 text-teal-700' : 'bg-slate-200 group-hover:bg-slate-300 text-slate-500'}`}>
              <useCase.icon className="w-5 h-5" />
            </div>
            <span className={`font-semibold ${activeTab === useCase.id ? 'text-slate-900' : 'text-slate-600'}`}>
              {useCase.label}
            </span>
          </button>
        ))}
      </div>

      {/* Content Preview */}
      <div className="w-full lg:w-2/3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-2 gap-8 bg-white p-8 rounded-3xl shadow-xl ring-1 ring-slate-900/5 h-[400px]"
          >
            <div className="flex flex-col justify-center space-y-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${activeCase.color} text-white shadow-lg`}>
                <activeCase.icon className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                {activeCase.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {activeCase.description}
              </p>
            </div>
            <div className="relative rounded-2xl bg-slate-50 border border-slate-100 p-4 shadow-inner flex items-center justify-center">
              {activeCase.visual}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Navigation */}
      <nav className="absolute inset-x-0 top-0 z-50 flex items-center justify-between p-6 lg:px-8">
        <div className="flex lg:flex-1">
          <span className="text-xl font-bold tracking-tight text-teal-800">ComplianceVideo</span>
        </div>
        <div className="flex flex-1 justify-end">
          <Link href="/login" className="text-sm font-medium leading-6 text-slate-600 hover:text-teal-700 transition-colors">
            Log in <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <div className="relative isolate pt-24 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-16 lg:items-center">

              {/* Left Column: Copy */}
              <motion.div
                className="max-w-2xl lg:max-w-none"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
              >
                <motion.h1
                  variants={itemVariants}
                  className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl mb-6 relative z-10"
                >
                  Transform Dry Policies into <span className="text-teal-700">High-Retention Training</span>.
                  <span className="block text-2xl sm:text-3xl mt-2 font-medium text-slate-500 tracking-normal">(No Avatars. Just Learning.)</span>
                </motion.h1>

                <motion.p variants={itemVariants} className="mt-6 text-lg leading-8 text-slate-600 mb-8 max-w-lg">
                  The only AI video platform engineered for <span className="font-semibold text-teal-700">Instructional Design</span>. Turn documents into dynamic, kinetic, and pedagogically sound videos in minutes using specialist AI agents.
                </motion.p>

                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-md bg-teal-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 transition-all hover:scale-105"
                  >
                    Generate Your First Video
                  </Link>
                  <p className="text-xs text-slate-500 font-medium">No credit card required • Enterprise ready</p>
                </motion.div>
              </motion.div>

              {/* Right Column: Visuals */}
              <motion.div
                className="mt-16 lg:mt-0 relative"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >

                {/* Decorative background blob */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-50 rounded-full blur-3xl opacity-50 -z-10 animate-pulse" />

                <div className="relative w-full h-full min-h-[450px]">
                  <ProcessVisualization />
                </div>

              </motion.div>
            </div>
          </div>
        </div>

        {/* COGNITIVE SCIENCE BLOCK */}
        <div className="bg-teal-50/50 py-24 sm:py-32 border-y border-teal-100/50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-inset ring-teal-200 mb-6"
              >
                <Brain className="w-4 h-4" />
                Cognitive Science
              </motion.div>

              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-6">
                Designed for Retention, Not Just Views.
              </h2>

              <p className="text-lg leading-8 text-slate-600 mb-8">
                Talking heads add <span className="text-slate-900 font-semibold">'Extraneous Cognitive Load'</span>—distracting your team from the policy details. We use Kinetic Typography and Congruent Imagery to focus attention on the message.
              </p>

              <blockquote className="text-sm text-slate-500 italic border-l-2 border-teal-200 pl-4 mx-auto max-w-md bg-white/50 p-4 rounded-r-md">
                "Built on the principles of Mayer's Multimedia Learning Theory."
              </blockquote>
            </div>
          </div>
        </div>

        {/* SPECIALIST WORKFLOW (BENTO GRID) */}
        <div className="py-24 sm:py-32 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Meet Your New <span className="text-teal-700">AI Production Team</span>
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                A complete production studio in your browser. Specialist agents work in parallel to generate assets 100x faster than humans.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
              {/* Card 1: Scriptwriter */}
              <motion.div
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl bg-slate-50 p-8 ring-1 ring-slate-900/5 transition-all hover:shadow-lg hover:shadow-teal-900/5 hover:ring-teal-100"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <FilePenLine className="w-24 h-24 text-teal-700" />
                </div>
                <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-teal-100 p-3">
                  <FilePenLine className="w-6 h-6 text-teal-700" />
                </div>
                <h3 className="text-lg font-semibold leading-8 text-slate-900">The Scriptwriter</h3>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  Extracts learning objectives from your PDF, structuring content for maximum clarity and educational retention.
                </p>
              </motion.div>

              {/* Card 2: Artist */}
              <motion.div
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl bg-slate-50 p-8 ring-1 ring-slate-900/5 transition-all hover:shadow-lg hover:shadow-teal-900/5 hover:ring-teal-100"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Palette className="w-24 h-24 text-teal-700" />
                </div>
                <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-teal-100 p-3">
                  <Palette className="w-6 h-6 text-teal-700" />
                </div>
                <h3 className="text-lg font-semibold leading-8 text-slate-900">The Artist <span className="text-xs font-normal text-slate-400 ml-2">(Imagen 4)</span></h3>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  Generates bespoke, context-aware imagery. No more generic stock photos—every visual reinforces your specific subject matter.
                </p>
              </motion.div>

              {/* Card 3: Narrator */}
              <motion.div
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl bg-slate-50 p-8 ring-1 ring-slate-900/5 transition-all hover:shadow-lg hover:shadow-teal-900/5 hover:ring-teal-100"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <AudioWaveform className="w-24 h-24 text-teal-700" />
                </div>
                <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-teal-100 p-3">
                  <AudioWaveform className="w-6 h-6 text-teal-700" />
                </div>
                <h3 className="text-lg font-semibold leading-8 text-slate-900">The Narrator <span className="text-xs font-normal text-slate-400 ml-2">(Amazon Polly)</span></h3>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  Neural TTS that understands intonation, emphasis, and pacing. Delivers studio-quality voiceovers in multiple languages.
                </p>
              </motion.div>

              {/* Card 4: Animator */}
              <motion.div
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl bg-slate-50 p-8 ring-1 ring-slate-900/5 transition-all hover:shadow-lg hover:shadow-teal-900/5 hover:ring-teal-100"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Code2 className="w-24 h-24 text-teal-700" />
                </div>
                <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-teal-100 p-3">
                  <Code2 className="w-6 h-6 text-teal-700" />
                </div>
                <h3 className="text-lg font-semibold leading-8 text-slate-900">The Animator <span className="text-xs font-normal text-slate-400 ml-2">(React)</span></h3>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  Visualizes complex processes with dynamic, code-driven animations. Updates instantly if you change the script.
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* FAQ SECTION */}
        <div className="py-24 sm:py-32 bg-slate-50 border-t border-slate-200">
          <div className="mx-auto max-w-2xl px-6 lg:px-8 text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Common <span className="text-teal-700">Questions</span>
            </h2>
            <p className="mt-4 text-slate-600">Everything you need to know about switching from avatars to kinetic video.</p>
          </div>
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <FAQAccordion />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-8 md:order-2">
            <Link href="#" className="text-sm leading-6 text-slate-500 hover:text-slate-900 transition-colors">
              Terms
            </Link>
            <Link href="#" className="text-sm leading-6 text-slate-500 hover:text-slate-900 transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-sm leading-6 text-slate-500 hover:text-slate-900 transition-colors">
              Contact
            </Link>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-slate-400">
              &copy; {new Date().getFullYear()} ComplianceVideo, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "But aren't avatars more personal?",
      answer: "Is an uncanny valley robot really personal? We prioritize respectful, clear communication. Research shows that stylized motion graphics often retain attention better than synthetic humans because they avoid the 'creepy' factor and focus purely on the information."
    },
    {
      question: "Is animation hard to edit?",
      answer: "Not with us. It's code-based. Change the text in our editor, and the animation updates instantly. No re-rendering times, no 'reshooting'—just instant updates, which is critical for compliance policies that change frequently."
    },
    {
      question: "How does it integrate with our LMS?",
      answer: "We export SCORM 1.2 and 2004 compliant packages as well as MP4s. You can drop our videos directly into Workday, Cornerstone, or any modern LMS."
    }
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div key={index} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-900">{faq.question}</span>
            <ChevronDown
              className={`h-5 w-5 text-slate-400 transform transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-6 pb-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                  {faq.answer}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}