import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Discovery", to: "/discovery" },
  { label: "Matches", to: "/matches" },
  { label: "My Profile", to: "/me" },
  { label: "Settings", to: "/settings" },
];

export default function Navigation() {
  const location = useLocation();
  const showNav = location.pathname !== "/";

  if (!showNav) return null;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold text-[#1e40af]">
          Koina
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-1 rounded-full transition ${
                location.pathname.startsWith(item.to)
                  ? "bg-[#1e40af] text-white"
                  : "hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/onboarding"
            className="px-4 py-2 bg-[#f97316] text-white rounded-full shadow hover:opacity-90"
          >
            Update Profile
          </Link>
        </nav>
      </div>
    </header>
  );
}
