import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TrendingUp, Twitter, Linkedin, Github, MessageCircle } from "lucide-react";

const Footer = () => {
  const { t, i18n } = useTranslation();
  const currentYear = new Date().getFullYear();
  const isRTL = i18n.language === "ar";

  const footerLinks = {
    product: [
      { name: t("nav.challenges"), href: "/challenges" },
      { name: t("nav.dashboard"), href: "/dashboard" },
      { name: t("nav.leaderboard"), href: "/leaderboard" },
      { name: t("footer.aiSignals"), href: "#" },
    ],
    company: [
      { name: t("footer.about"), href: "#" },
      { name: t("footer.blog"), href: "#" },
      { name: t("footer.careers"), href: "#" },
      { name: t("footer.contact"), href: "#" },
    ],
    legal: [
      { name: t("footer.termsOfUse"), href: "#" },
      { name: t("footer.privacy"), href: "#" },
      { name: t("footer.legalNotice"), href: "#" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: MessageCircle, href: "#", label: "Discord" },
    { icon: Github, href: "#", label: "GitHub" },
  ];

  return (
    <footer className="border-t border-border bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground text-lg tracking-tight">TradeSense</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs mb-5 leading-relaxed">
              {t("footer.description")}
            </p>
            <div className="flex gap-2">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">{t("footer.product")}</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">{t("footer.company")}</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">{t("footer.legal")}</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} TradeSense AI. {t("footer.rights")}.
          </p>
          <p className="text-xs text-muted-foreground">
            {t("footer.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
