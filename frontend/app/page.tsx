import Link from 'next/link';
import { Shield, UserX, Building, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation - kept minimal as requested */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <span className="text-xl font-bold tracking-tight text-teal-700">ComplianceVideo</span>
          </div>
          <div className="flex flex-1 justify-end">
            <Link href="/login" className="text-sm font-semibold leading-6 text-slate-900 hover:text-teal-700 transition-colors">
              Log in <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </nav>
      </header>

      <main className="isolate">
        {/* Hero Section */}
        <div className="relative pt-14">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-teal-200 to-slate-200 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
          </div>

          <div className="py-24 sm:py-32 lg:pb-40">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
                  Bespoke Company Training. <br className="hidden sm:block" />
                  <span className="text-teal-700">Generated in Minutes.</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-600">
                  Create training videos without the cost or hastle. <br />
                  Effective, reliable and bespoke to your company policies.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link
                    href="/login"
                    className="rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                  >
                    Start Free
                  </Link>
                  <Link href="#features" className="text-sm font-semibold leading-6 text-slate-900 hover:text-teal-700">
                    Learn more <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
            <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-teal-200 to-slate-200 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
          </div>
        </div>

        {/* Why Us Grid */}
        <div id="features" className="mx-auto max-w-7xl px-6 lg:px-8 pb-24 sm:pb-32">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-teal-700">Why Us</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Built for the Modern Institution
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-teal-50">
                  <Shield className="h-8 w-8 text-teal-700" aria-hidden="true" />
                </div>
                <dt className="text-xl font-semibold leading-7 text-slate-900">
                  Jurisdiction Safe
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">
                    Content adapted to your specific legal jurisdiction. Ensure compliance across borders without the headache.
                  </p>
                </dd>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-teal-50">
                  <UserX className="h-8 w-8 text-teal-700" aria-hidden="true" />
                </div>
                <dt className="text-xl font-semibold leading-7 text-slate-900">
                  No Robotic Avatars
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">
                    Avoid the uncanny valley. We use professional voiceovers and clean, kinetic typography and imagery.
                  </p>
                </dd>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-teal-50">
                  <Building className="h-8 w-8 text-teal-700" aria-hidden="true" />
                </div>
                <dt className="text-xl font-semibold leading-7 text-slate-900">
                  Enterprise Ready
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">
                    Secure, scalable, and designed for large organizations. Integrate seamlessley with your existing LMS.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <Link href="#" className="text-slate-400 hover:text-slate-500">
              <span className="sr-only">Terms</span>
              Terms
            </Link>
            <Link href="#" className="text-slate-400 hover:text-slate-500">
              <span className="sr-only">Privacy</span>
              Privacy
            </Link>
            <Link href="#" className="text-slate-400 hover:text-slate-500">
              <span className="sr-only">Contact</span>
              Contact
            </Link>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-slate-500">
              &copy; {new Date().getFullYear()} ComplianceVideo, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}