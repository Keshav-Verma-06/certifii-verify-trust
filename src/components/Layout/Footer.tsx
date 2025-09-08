import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { name: "About", href: "/about" },
    { name: "Contact Us", href: "/contact" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ];

  return (
    <footer className="bg-muted mt-auto">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">CertValidator</span>
                <p className="text-sm text-muted-foreground">Academic Authenticity System</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              A comprehensive digital platform for authenticating and verifying academic certificates, 
              ensuring trust and integrity in educational credentials across institutions.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/verify" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Verify Certificate
                </Link>
              </li>
              <li>
                <Link 
                  to="/institution" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Institution Portal
                </Link>
              </li>
              <li>
                <Link 
                  to="/admin" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Admin Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href} 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Government of Jharkhand - Department of Higher and Technical Education. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground mt-2 sm:mt-0">
            Powered by CertValidator
          </p>
        </div>
      </div>
    </footer>
  );
};