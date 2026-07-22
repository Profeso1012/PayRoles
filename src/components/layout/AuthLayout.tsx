import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left panel — image fills entirely */}
      <div className="hidden md:flex flex-1 relative overflow-hidden">
        <img
          src="/assets/mockup2.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay so text is readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(15,46,35,0.93) 0%, rgba(31,111,78,0.80) 55%, rgba(15,46,35,0.70) 100%)',
          }}
        />
        {/* Radial glow accents */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 20% 80%, rgba(79,173,114,0.25) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(205,239,215,0.10) 0%, transparent 50%)',
          }}
        />
        {/* Centered content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <img src="/assets/payrole-logo.png" alt="PayRole" className="h-10 mb-6" />
          <p className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold text-white text-center leading-snug">
            Payroll. People. Possibilities.
          </p>
          <p className="text-sm text-white/60 text-center mt-3 max-w-[280px]">
            Trusted by leading African businesses for fast, accurate, compliant payroll.
          </p>
        </div>
      </div>

      {/* Right panel — form outlet */}
      <div className="w-full md:w-[480px] md:min-w-[480px] bg-white flex flex-col justify-center overflow-y-auto px-10 py-8">
        <Outlet />
      </div>
    </div>
  );
}
