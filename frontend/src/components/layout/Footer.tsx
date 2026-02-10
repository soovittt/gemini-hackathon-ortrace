import { Github, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import ortraceLogo from "@/assets/ortrace_logo.png";

const Footer = () => {
  const footerLinks = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#" },
        { label: "Pricing", href: "#" },
        { label: "Demo", href: "/dummy" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "#" },
        { label: "API Reference", href: "#" },
        { label: "Blog", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
  ];

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="relative border-t border-border/50 bg-card/50 backdrop-blur-sm">
      {/* Main footer content */}
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="group inline-flex items-center mb-6">
              <img 
                src={ortraceLogo} 
                alt="Ortrace" 
                className="h-5 transition-opacity group-hover:opacity-80 dark:invert"
              />
            </Link>
            <p className="mb-6 max-w-sm text-muted-foreground leading-relaxed">
              Transform unscalable session replay videos into structured product 
              intelligence. Faster feedback, clearer insights, actionable tickets.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((column) => (
            <div key={column.title}>
              <h4 className="mb-4 font-semibold text-foreground">{column.title}</h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.label === "Demo" ? (
                      <span className="text-sm text-muted-foreground cursor-default">
                        {link.label}
                      </span>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/50">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Ortrace. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
