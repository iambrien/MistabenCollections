import { Link } from "react-router-dom";
import { Instagram, Twitter, Phone } from "lucide-react";

export default function Footer() {
  const settings = JSON.parse(localStorage.getItem("mistaben_settings") || "{}");
  const storeName = settings.storeName || "Mistaben Collections";

  return (
    <footer className="bg-foreground text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-2">MISTA<span className="text-brand">BEN</span></h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              {settings.storeTagline || "Premium fashion collections delivered to your door."}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-300">Quick Links</h4>
            <ul className="space-y-2">
              {[["Home", "/"], ["Shop", "/products"]].map(([label, href]) => (
                <li key={href}>
                  <Link to={href} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-300">Contact</h4>
            {settings.whatsappNumber && (
              <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />
                {settings.whatsappNumber}
              </a>
            )}
            <div className="flex gap-3 mt-4">
              <a href="#" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><Twitter className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
